import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const bannerService = {
  async list(activeOnly = true) {
    if (!isSupabaseConfigured) return []
    let q = supabase.from('banners').select('*').order('sort_order')
    if (activeOnly) q = q.eq('is_active', true)
    const { data } = await q
    return data || []
  },
  async byPosition(position: string) {
    if (!isSupabaseConfigured) return []
    const { data } = await supabase.from('banners').select('*').eq('position', position).eq('is_active', true).order('sort_order')
    return data || []
  },
  async create(payload: any) {
    const { data, error } = await supabase.from('banners').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id: string, payload: any) {
    const { data, error } = await supabase.from('banners').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id: string) {
    const { error } = await supabase.from('banners').delete().eq('id', id)
    if (error) throw error
  },
}
