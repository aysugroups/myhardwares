import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const categoryService = {
  async list(activeOnly = true) {
    if (!isSupabaseConfigured) return []
    let q = supabase.from('categories').select('*').order('sort_order', { ascending: true })
    if (activeOnly) q = q.eq('is_active', true)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async getBySlug(slug: string) {
    if (!isSupabaseConfigured) return null
    const { data } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle()
    return data
  },
  async create(payload: any) {
    const { data, error } = await supabase.from('categories').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id: string, payload: any) {
    const { data, error } = await supabase.from('categories').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  },
  async subcategories(categoryId?: string) {
    if (!isSupabaseConfigured) return []
    let q = supabase.from('subcategories').select('*').order('sort_order')
    if (categoryId) q = q.eq('category_id', categoryId)
    const { data } = await q
    return data || []
  },
}
