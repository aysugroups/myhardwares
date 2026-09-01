import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const brandService = {
  async list(activeOnly = true) {
    if (!isSupabaseConfigured) return []
    let q = supabase.from('brands').select('*').order('sort_order', { ascending: true })
    if (activeOnly) q = q.eq('is_active', true)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(payload: any) {
    const { data, error } = await supabase.from('brands').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id: string, payload: any) {
    const { data, error } = await supabase.from('brands').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id: string) {
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) throw error
  },
}
