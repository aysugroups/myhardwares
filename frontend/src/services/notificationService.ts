import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const notificationService = {
  async listAdmin(limit = 20) {
    if (!isSupabaseConfigured) return []
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .is('user_id', null)
      .order('created_at', { ascending: false })
      .limit(limit)
    return data || []
  },
  async listMine(userId: string, limit = 20) {
    if (!isSupabaseConfigured || !userId) return []
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return data || []
  },
  async markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  },
  subscribeAdmin(cb: (n: any) => void) {
    if (!isSupabaseConfigured) return () => {}
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=is.null' }, (p) => cb(p.new))
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
  subscribeOrders(cb: () => void) {
    if (!isSupabaseConfigured) return () => {}
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => cb())
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}
