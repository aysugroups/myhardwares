// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, hmacHex, timingSafeEqual } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const RZP_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!

    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()
    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing payment fields' }, 400)
    }

    // Verify signature server-side: HMAC_SHA256(order_id|payment_id, secret)
    const expected = await hmacHex(RZP_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`)
    if (!timingSafeEqual(expected, razorpay_signature)) {
      const admin0 = createClient(SUPABASE_URL, SERVICE_ROLE)
      await admin0.rpc('mark_order_failed', { p_order_id: order_id })
      return json({ error: 'Payment signature verification failed' }, 400)
    }

    // Atomically confirm (idempotent): reduce stock, record payment, clear cart
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data, error } = await admin.rpc('confirm_order_paid', {
      p_order_id: order_id,
      p_rzp_order_id: razorpay_order_id,
      p_rzp_payment_id: razorpay_payment_id,
    })
    if (error) return json({ error: error.message }, 400)
    return json(data)
  } catch (e) {
    return json({ error: (e as any).message || 'Server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
