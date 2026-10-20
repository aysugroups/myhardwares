// deno-lint-ignore-file no-explicit-any
// Razorpay Webhook — authoritative, idempotent source of truth for payment events.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, hmacHex, timingSafeEqual } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')?.trim()
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')?.trim()

    if (!SUPABASE_URL || !SERVICE_ROLE || !WEBHOOK_SECRET) {
      console.error('razorpay-webhook: environment configuration missing')
      return new Response('Server configuration error', { status: 500 })
    }

    // 1. Verify HMAC-SHA256 signature against the exact raw request body
    const raw = await req.text()
    const signature = (req.headers.get('x-razorpay-signature') || '').trim()
    if (!raw || !signature) {
      return new Response('Missing signature or payload', { status: 400 })
    }

    const expected = await hmacHex(WEBHOOK_SECRET, raw)
    if (!timingSafeEqual(expected, signature)) {
      return new Response('Invalid signature', { status: 400 })
    }

    let event: any
    try {
      event = JSON.parse(raw)
    } catch {
      return new Response('Invalid JSON payload', { status: 400 })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 2. Handle captured payments (payment.captured and order.paid)
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload?.payment?.entity
      const rzpOrderId = payment?.order_id || event.payload?.order?.entity?.id
      const rzpPaymentId = payment?.id

      if (
        !rzpOrderId ||
        !rzpPaymentId ||
        payment?.status !== 'captured' ||
        typeof payment?.amount !== 'number' ||
        payment?.currency !== 'INR'
      ) {
        return new Response('Invalid captured payment payload', { status: 400 })
      }

      const { data: order, error: lookupError } = await admin
        .from('orders')
        .select('id, order_number, total, payment_status, razorpay_order_id, razorpay_payment_id')
        .eq('razorpay_order_id', rzpOrderId)
        .maybeSingle()

      if (lookupError) {
        console.error('razorpay-webhook: order lookup failed', lookupError)
        return new Response('Order lookup failed', { status: 500 })
      }

      if (!order) {
        // Return 500 so Razorpay retries if webhook arrived while order link was still committing
        return new Response('Order not found', { status: 500 })
      }

      if (order.razorpay_order_id !== rzpOrderId) {
        return new Response('Razorpay order ID mismatch', { status: 400 })
      }

      const expectedAmount = Math.round(Number(order.total) * 100)
      if (!Number.isSafeInteger(expectedAmount) || payment.amount !== expectedAmount) {
        console.error('razorpay-webhook: payment amount mismatch', {
          rzpOrderId,
          rzpPaymentId,
          expectedAmount,
          receivedAmount: payment.amount,
        })
        return new Response('Payment amount mismatch', { status: 400 })
      }

      // Check payment ID reuse across orders
      const { data: existingPayment } = await admin
        .from('payments')
        .select('id, order_id')
        .eq('razorpay_payment_id', rzpPaymentId)
        .maybeSingle()

      if (existingPayment && existingPayment.order_id !== order.id) {
        return new Response('Payment ID belongs to another order', { status: 400 })
      }

      // Idempotent early return if already paid
      if (order.payment_status === 'paid') {
        if (order.razorpay_payment_id && order.razorpay_payment_id !== rzpPaymentId) {
          return new Response('Order already paid with a different payment ID', { status: 400 })
        }
        return Response.json({
          received: true,
          already_paid: true,
          order_id: order.id,
          order_number: order.order_number,
        })
      }

      const { error: rpcError } = await admin.rpc('confirm_order_paid', {
        p_order_id: order.id,
        p_rzp_order_id: rzpOrderId,
        p_rzp_payment_id: rzpPaymentId,
      })

      if (rpcError) {
        console.error('razorpay-webhook: confirm_order_paid failed', rpcError)
        const msg = rpcError.message || ''
        if (
          msg.includes('mismatch') ||
          msg.includes('another order') ||
          msg.includes('different payment ID')
        ) {
          return new Response(msg, { status: 400 })
        }
        return new Response('Payment confirmation failed', { status: 500 })
      }

      return Response.json({
        received: true,
        order_id: order.id,
        order_number: order.order_number,
      })
    } else if (event.event === 'payment.failed') {
      const payment = event.payload?.payment?.entity
      const rzpOrderId = payment?.order_id

      if (!rzpOrderId) {
        return new Response('Missing Razorpay order ID', { status: 400 })
      }

      const { data: order, error: lookupError } = await admin
        .from('orders')
        .select('id, order_number, payment_status')
        .eq('razorpay_order_id', rzpOrderId)
        .maybeSingle()

      if (lookupError) {
        console.error('razorpay-webhook: failed-payment order lookup failed', lookupError)
        return new Response('Order lookup failed', { status: 500 })
      }

      if (!order) {
        return Response.json({ received: true, ignored: 'order_not_found' })
      }

      // Never downgrade an already-paid order when a delayed failure event arrives
      if (order.payment_status !== 'paid') {
        await admin.rpc('mark_order_failed', { p_order_id: order.id })
      }

      return Response.json({
        received: true,
        order_id: order.id,
        order_number: order.order_number,
        ...(order.payment_status === 'paid' ? { already_paid: true } : {}),
      })
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('Razorpay webhook processing failed:', error)
    return new Response('Webhook processing failed', { status: 500 })
  }
})
