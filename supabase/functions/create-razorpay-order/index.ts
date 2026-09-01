// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const RZP_KEY = Deno.env.get('RAZORPAY_KEY_ID')!
    const RZP_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!

    // Identify the calling user from their JWT
    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Not authenticated' }, 401)

    const { items, address, coupon_code } = await req.json()
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Server computes the authoritative total; client prices are ignored.
    const { data: pending, error: rpcErr } = await admin.rpc('create_pending_order', {
      p_user_id: user.id,
      p_items: items,
      p_address: address,
      p_coupon: coupon_code || null,
    })
    if (rpcErr) return json({ error: rpcErr.message }, 400)

    // Create Razorpay order
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${RZP_KEY}:${RZP_SECRET}`),
      },
      body: JSON.stringify({
        amount: pending.amount, // paise
        currency: 'INR',
        receipt: pending.order_number,
        notes: { order_id: pending.order_id },
      }),
    })
    const rzpOrder = await rzpRes.json()
    if (!rzpRes.ok) {
      await admin.rpc('mark_order_failed', { p_order_id: pending.order_id })
      return json({ error: rzpOrder?.error?.description || 'Razorpay order failed' }, 400)
    }

    await admin.from('orders').update({ razorpay_order_id: rzpOrder.id }).eq('id', pending.order_id)

    return json({
      order_id: pending.order_id,
      razorpay_order_id: rzpOrder.id,
      amount: pending.amount,
      currency: 'INR',
      key_id: RZP_KEY,
      breakdown: pending.breakdown,
    })
  } catch (e) {
    return json({ error: (e as any).message || 'Server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
