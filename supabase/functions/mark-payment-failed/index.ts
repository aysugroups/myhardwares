// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/utils.ts'

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

    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
      return json({ error: 'Server configuration error' }, 500)
    }

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

    const { order_id } = body || {}
    if (!order_id || typeof order_id !== 'string') {
      return json({ error: 'Missing order_id' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: order, error: lookupError } = await admin
      .from('orders')
      .select('id, order_number, user_id, payment_status')
      .eq('id', order_id)
      .maybeSingle()

    if (lookupError) {
      return json({ error: 'Could not look up order' }, 500)
    }

    if (!order) {
      return json({ error: 'Order not found' }, 404)
    }

    if (order.user_id !== user.id) {
      return json({ error: 'Forbidden' }, 403)
    }

    // Never downgrade an already-paid order
    if (order.payment_status === 'paid') {
      return json({
        ok: true,
        already_paid: true,
        order_id: order.id,
        order_number: order.order_number,
      })
    }

    await admin.rpc('mark_order_failed', { p_order_id: order.id })
    return json({
      ok: true,
      order_id: order.id,
      order_number: order.order_number,
    })
  } catch (e) {
    return json({ error: (e as any).message || 'Server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
