import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const adminService = {
  async dashboard() {
    if (!isSupabaseConfigured) return null
    // Aggregated by a SECURITY DEFINER RPC so a single round-trip returns real numbers.
    const { data, error } = await supabase.rpc('admin_dashboard_stats')
    if (error) throw error
    return data
  },

  async orders(opts: { status?: string; search?: string; page?: number; pageSize?: number } = {}) {
    if (!isSupabaseConfigured) return { items: [], total: 0 }
    const page = opts.page ?? 1
    const pageSize = opts.pageSize ?? 20
    const from = (page - 1) * pageSize
    let q = supabase
      .from('orders')
      .select('id, order_number, user_id, total, payment_status, status, created_at, address, profile:profiles(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status)
    if (opts.search) q = q.ilike('order_number', `%${opts.search}%`)
    const { data, count, error } = await q.range(from, from + pageSize - 1)
    if (error) throw error
    return { items: data || [], total: count || 0 }
  },

  async orderById(id: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, items:order_items(*), history:order_status_history(*), profile:profiles(full_name, email, phone)`)
      .eq('id', id)
      .single()
    if (error) throw error
    if (data?.history) data.history.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return data
  },

  async updateOrderStatus(orderId: string, status: string, note?: string, tracking?: string) {
    const patch: any = { status }
    if (tracking !== undefined) patch.tracking_number = tracking
    const { error } = await supabase.from('orders').update(patch).eq('id', orderId)
    if (error) throw error
    await supabase.from('order_status_history').insert({ order_id: orderId, status, note: note || null })
  },

  async customers() {
    if (!isSupabaseConfigured) return []
    const { data } = await supabase.rpc('admin_customers')
    return data || []
  },

  async setCustomerStatus(userId: string, status: string) {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', userId)
    if (error) throw error
  },
}
