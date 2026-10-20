// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/utils.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    if (
      !SUPABASE_URL ||
      !SERVICE_ROLE ||
      !ANON ||
      !RZP_KEY ||
      !RZP_SECRET ||
      RZP_KEY.includes('xxxx') ||
      RZP_SECRET.includes('xxxx')
    ) {
      console.error('create-razorpay-order: missing or placeholder server configuration')
      return json({ error: 'Payment gateway configuration is incomplete' }, 500)
    }

    // 1. Authenticate the calling user from their JWT
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

    const { items, address, coupon_code, order_id } = body || {}
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    let pending: {
      order_id: string
      order_number: string
      amount: number
      breakdown: { subtotal: number; discount: number; shipping: number; tax: number; total: number }
    } | null = null

    // 2. Support retrying payment on an existing unpaid order owned by this user
    if (order_id && typeof order_id === 'string' && UUID_RE.test(order_id)) {
      const { data: existingOrder, error: existingErr } = await admin
        .from('orders')
        .select(
          'id, order_number, user_id, subtotal, discount, coupon_code, shipping, tax, total, payment_status, status, items:order_items(product_id, product_name, quantity)',
        )
        .eq('id', order_id)
        .maybeSingle()

      if (existingErr) {
        return json({ error: 'Could not look up existing order' }, 500)
      }

      if (existingOrder) {
        if (existingOrder.user_id !== user.id) {
          return json({ error: 'Forbidden: Order belongs to another user' }, 403)
        }
        if (existingOrder.payment_status === 'paid') {
          return json({ error: 'Order is already paid' }, 400)
        }
        if (existingOrder.status === 'cancelled' || existingOrder.status === 'refunded') {
          return json({ error: 'Order is no longer payable' }, 400)
        }

        // Re-verify product availability and stock before issuing a new Razorpay order
        const orderItems = Array.isArray(existingOrder.items) ? existingOrder.items : []
        if (orderItems.length === 0) {
          return json({ error: 'Order has no items' }, 400)
        }

        for (const li of orderItems) {
          if (!li.product_id) {
            return json({ error: `Product ${li.product_name || ''} is no longer available` }, 400)
          }
          const { data: prod } = await admin
            .from('products')
            .select('id, name, stock, status')
            .eq('id', li.product_id)
            .maybeSingle()

          if (!prod || prod.status !== 'published') {
            return json({ error: `Product ${li.product_name || ''} is unavailable` }, 400)
          }
          if (Number(prod.stock) < Number(li.quantity)) {
            return json({ error: `Insufficient stock for ${prod.name}` }, 400)
          }
        }

        if (existingOrder.coupon_code && String(existingOrder.coupon_code).trim().length > 0) {
          const { data: cpCheck, error: cpErr } = await admin.rpc('validate_coupon', {
            p_code: String(existingOrder.coupon_code).trim(),
            p_subtotal: Number(existingOrder.subtotal),
            p_user_id: user.id,
          })
          if (cpErr || !cpCheck?.valid) {
            return json({ error: cpCheck?.message || 'Coupon on this order is no longer valid' }, 400)
          }
        }

        const amountPaise = Math.round(Number(existingOrder.total) * 100)
        if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
          return json({ error: 'Order total must be at least ₹1.00' }, 400)
        }

        pending = {
          order_id: existingOrder.id,
          order_number: existingOrder.order_number,
          amount: amountPaise,
          breakdown: {
            subtotal: Number(existingOrder.subtotal),
            discount: Number(existingOrder.discount),
            shipping: Number(existingOrder.shipping),
            tax: Number(existingOrder.tax),
            total: Number(existingOrder.total),
          },
        }
      }
    }

    // 3. Otherwise validate checkout payload and create a new pending order via authoritative RPC
    if (!pending) {
      if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
        return json({ error: 'Cart is empty or invalid' }, 400)
      }

      const normalizedItems: { product_id: string; quantity: number }[] = []
      const qtyByProduct = new Map<string, number>()

      for (const item of items) {
        const pid = typeof item?.product_id === 'string' ? item.product_id.trim() : ''
        const qty = Number(item?.quantity)
        if (!UUID_RE.test(pid) || !Number.isInteger(qty) || qty <= 0 || qty > 1000) {
          return json({ error: 'Invalid product ID or quantity in cart' }, 400)
        }
        qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + qty)
      }

      for (const [product_id, quantity] of qtyByProduct.entries()) {
        normalizedItems.push({ product_id, quantity })
      }

      if (
        !address ||
        typeof address !== 'object' ||
        !String(address.full_name || '').trim() ||
        !String(address.phone || '').trim() ||
        !String(address.line1 || '').trim() ||
        !String(address.city || '').trim() ||
        !String(address.state || '').trim() ||
        !String(address.pincode || '').trim()
      ) {
        return json({ error: 'Complete delivery address is required' }, 400)
      }

      const sanitizedCoupon =
        typeof coupon_code === 'string' && coupon_code.trim().length > 0
          ? coupon_code.trim().toUpperCase()
          : null

      const { data: rpcData, error: rpcErr } = await admin.rpc('create_pending_order', {
        p_user_id: user.id,
        p_items: normalizedItems,
        p_address: address,
        p_coupon: sanitizedCoupon,
      })

      if (rpcErr || !rpcData) {
        return json({ error: rpcErr?.message || 'Could not create order' }, 400)
      }

      const amountPaise = Math.round(Number(rpcData.amount))
      if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
        await admin.rpc('mark_order_failed', { p_order_id: rpcData.order_id })
        return json({ error: 'Order total must be at least ₹1.00' }, 400)
      }

      pending = {
        order_id: rpcData.order_id,
        order_number: rpcData.order_number,
        amount: amountPaise,
        breakdown: rpcData.breakdown,
      }
    }

    // 4. Create Razorpay Order via server-side API
    let rzpRes: Response
    try {
      rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + btoa(`${RZP_KEY}:${RZP_SECRET}`),
        },
        body: JSON.stringify({
          amount: pending.amount, // in paise
          currency: 'INR',
          receipt: pending.order_number,
          notes: {
            order_id: pending.order_id,
            order_number: pending.order_number,
            user_id: user.id,
          },
        }),
        signal: AbortSignal.timeout(15000),
      })
    } catch (fetchErr) {
      console.error('create-razorpay-order: Razorpay API request failed', fetchErr)
      await admin.rpc('mark_order_failed', { p_order_id: pending.order_id })
      return json({ error: 'Payment gateway is temporarily unreachable. Please try again.' }, 502)
    }

    const rzpOrder = await rzpRes.json().catch(() => null)
    if (
      !rzpRes.ok ||
      !rzpOrder?.id ||
      rzpOrder.amount !== pending.amount ||
      rzpOrder.currency !== 'INR'
    ) {
      await admin.rpc('mark_order_failed', { p_order_id: pending.order_id })
      return json(
        { error: rzpOrder?.error?.description || 'Could not initialize payment with Razorpay' },
        400,
      )
    }

    // 5. Associate the Razorpay order with the database order
    const { error: updateErr } = await admin
      .from('orders')
      .update({
        razorpay_order_id: rzpOrder.id,
        payment_method: 'razorpay',
        payment_status: 'pending',
        status: 'pending_payment',
      })
      .eq('id', pending.order_id)

    if (updateErr) {
      console.error('create-razorpay-order: failed to save razorpay_order_id', updateErr)
      return json({ error: 'Could not link payment order' }, 500)
    }

    return json({
      order_id: pending.order_id,
      order_number: pending.order_number,
      razorpay_order_id: rzpOrder.id,
      amount: pending.amount,
      currency: 'INR',
      key_id: RZP_KEY,
      breakdown: pending.breakdown,
    })
  } catch (e) {
    console.error('create-razorpay-order unexpected error:', e)
    return json({ error: 'Could not start payment' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
