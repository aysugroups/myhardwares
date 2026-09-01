// deno-lint-ignore-file no-explicit-any
// Razorpay Webhook — the authoritative source of truth for payment status.
// Configure in Razorpay Dashboard: event payment.captured -> this function URL.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, hmacHex, timingSafeEqual } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!

    const raw = await req.text()
    const signature = req.headers.get('x-razorpay-signature') || ''
    const expected = await hmacHex(WEBHOOK_SECRET, raw)
    if (!timingSafeEqual(expected, signature)) {
      return new Response('invalid signature', { status: 400 })
    }

    const event = JSON.parse(raw)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload?.payment?.entity
      const rzpOrderId = payment?.order_id
      const rzpPaymentId = payment?.id
      if (rzpOrderId) {
        const { data: order } = await admin.from('orders').select('id').eq('razorpay_order_id', rzpOrderId).maybeSingle()
        if (order) {
          // Idempotent — safe on retries / duplicate deliveries
          await admin.rpc('confirm_order_paid', {
            p_order_id: order.id,
            p_rzp_order_id: rzpOrderId,
            p_rzp_payment_id: rzpPaymentId,
          })
        }
      }
    } else if (event.event === 'payment.failed') {
      const rzpOrderId = event.payload?.payment?.entity?.order_id
      if (rzpOrderId) {
        const { data: order } = await admin.from('orders').select('id').eq('razorpay_order_id', rzpOrderId).maybeSingle()
        if (order) await admin.rpc('mark_order_failed', { p_order_id: order.id })
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response((e as any).message || 'error', { status: 500 })
  }
})
