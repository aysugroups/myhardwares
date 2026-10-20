// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, hmacHex, timingSafeEqual } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')?.trim()
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')?.trim()
    const RZP_KEY = Deno.env.get('RAZORPAY_KEY_ID')?.trim()
    const RZP_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')?.trim()

    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON || !RZP_KEY || !RZP_SECRET) {
      console.error('verify-razorpay-payment: server configuration missing')
      return json({ error: 'Server configuration error' }, 500)
    }

    // 1. Authenticate the calling customer
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Not authenticated' }, 401)
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser()

    if (authErr || !user) {
      return json({ error: 'Not authenticated' }, 401)
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON request body' }, 400)
    }

    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {}

    if (
      typeof order_id !== 'string' ||
      !order_id.trim() ||
      typeof razorpay_order_id !== 'string' ||
      !razorpay_order_id.trim() ||
      typeof razorpay_payment_id !== 'string' ||
      !razorpay_payment_id.trim() ||
      typeof razorpay_signature !== 'string' ||
      !razorpay_signature.trim()
    ) {
      return json({ error: 'Missing payment fields' }, 400)
    }

    // 2. Cryptographically verify Razorpay HMAC-SHA256 signature
    const expected = await hmacHex(RZP_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`)
    if (!timingSafeEqual(expected, razorpay_signature)) {
      return json({ error: 'Payment signature verification failed' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 3. Load order and verify ownership & Razorpay order association
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, order_number, user_id, total, payment_status, razorpay_order_id, razorpay_payment_id')
      .eq('id', order_id)
      .maybeSingle()

    if (orderError) {
      console.error('verify-razorpay-payment: order lookup failed', orderError)
      return json({ error: 'Could not look up order' }, 500)
    }

    if (!order) {
      return json({ error: 'Order not found' }, 404)
    }

    if (order.user_id !== user.id) {
      return json({ error: 'Order does not belong to this user' }, 403)
    }

    if (!order.razorpay_order_id || order.razorpay_order_id !== razorpay_order_id) {
      return json({ error: 'Razorpay order ID mismatch' }, 400)
    }

    // 4. Prevent a payment ID from being reused across different orders
    const { data: existingPayment } = await admin
      .from('payments')
      .select('id, order_id')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle()

    if (existingPayment && existingPayment.order_id !== order.id) {
      return json({ error: 'Payment ID is already associated with another order' }, 400)
    }

    // 5. Idempotency check (e.g. if webhook already confirmed this order)
    if (order.payment_status === 'paid') {
      if (order.razorpay_payment_id && order.razorpay_payment_id !== razorpay_payment_id) {
        return json({ error: 'Order was already paid with a different payment ID' }, 400)
      }
      return json({
        success: true,
        already_paid: true,
        order_id: order.id,
        order_number: order.order_number,
      })
    }

    // 6. Independently fetch and verify payment details from Razorpay Server API
    const expectedAmount = Math.round(Number(order.total) * 100)
    if (!Number.isSafeInteger(expectedAmount) || expectedAmount <= 0) {
      return json({ error: 'Invalid order total' }, 400)
    }

    const basicAuth = 'Basic ' + btoa(`${RZP_KEY}:${RZP_SECRET}`)
    let rzpRes: Response
    try {
      rzpRes = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,
        {
          headers: { Authorization: basicAuth },
          signal: AbortSignal.timeout(15000),
        },
      )
    } catch (fetchErr) {
      console.error('verify-razorpay-payment: Razorpay lookup network error', fetchErr)
      return json({ error: 'Could not verify payment with Razorpay' }, 502)
    }

    if (!rzpRes.ok) {
      console.error('verify-razorpay-payment: Razorpay payment lookup status', rzpRes.status)
      return json({ error: 'Could not verify payment with Razorpay' }, 502)
    }

    let payment = await rzpRes.json().catch(() => null)
    if (!payment || payment.id !== razorpay_payment_id || payment.order_id !== razorpay_order_id) {
      return json({ error: 'Payment order association mismatch' }, 400)
    }

    if (payment.currency !== 'INR' || payment.amount !== expectedAmount) {
      return json({ error: 'Payment amount or currency does not match order' }, 400)
    }

    // If the payment is authorized (manual capture mode), capture it server-side before confirming
    if (payment.status === 'authorized') {
      try {
        const capRes = await fetch(
          `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}/capture`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: basicAuth,
            },
            body: JSON.stringify({ amount: expectedAmount, currency: 'INR' }),
            signal: AbortSignal.timeout(15000),
          },
        )
        if (capRes.ok) {
          payment = await capRes.json().catch(() => payment)
        }
      } catch (capErr) {
        console.error('verify-razorpay-payment: capture request failed', capErr)
      }
    }

    if (payment.status !== 'captured') {
      return json({ error: `Payment is not captured (status: ${payment.status || 'unknown'})` }, 400)
    }

    // 7. Atomically confirm order paid in the database
    const { data: rpcData, error: rpcError } = await admin.rpc('confirm_order_paid', {
      p_order_id: order.id,
      p_rzp_order_id: razorpay_order_id,
      p_rzp_payment_id: razorpay_payment_id,
    })

    if (rpcError) {
      console.error('verify-razorpay-payment: confirm_order_paid error', rpcError)
      return json({ error: rpcError.message || 'Could not confirm order payment' }, 400)
    }

    return json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      ...(typeof rpcData === 'object' && rpcData !== null ? rpcData : {}),
    })
  } catch (error) {
    console.error('Payment verification failed:', error)
    return json({ error: 'Payment verification failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
