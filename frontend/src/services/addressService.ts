import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const addressService = {
  async list(userId: string) {
    if (!isSupabaseConfigured || !userId) return []
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    return data || []
  },
  async create(userId: string, payload: any) {
    if (payload.is_default) await this.clearDefault(userId)
    const { data, error } = await supabase.from('addresses').insert({ ...payload, user_id: userId }).select().single()
    if (error) throw error
    return data
  },
  async update(userId: string, id: string, payload: any) {
    if (payload.is_default) await this.clearDefault(userId)
    const { data, error } = await supabase.from('addresses').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id: string) {
    const { error } = await supabase.from('addresses').delete().eq('id', id)
    if (error) throw error
  },
  async clearDefault(userId: string) {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId)
  },
}
