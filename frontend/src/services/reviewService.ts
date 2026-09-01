import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const reviewService = {
  async forProduct(productId: string) {
    if (!isSupabaseConfigured) return []
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, title, comment, is_verified, created_at, profile:profiles(full_name)')
      .eq('product_id', productId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
    return data || []
  },
  async create(payload: { product_id: string; user_id: string; rating: number; title?: string; comment?: string }) {
    const { data, error } = await supabase.from('reviews').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async all() {
    if (!isSupabaseConfigured) return []
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, title, comment, is_verified, is_visible, created_at, product:products(name, slug), profile:profiles(full_name, email)')
      .order('created_at', { ascending: false })
    return data || []
  },
  async setVisibility(id: string, visible: boolean) {
    const { error } = await supabase.from('reviews').update({ is_visible: visible }).eq('id', id)
    if (error) throw error
  },
  async remove(id: string) {
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) throw error
  },
}
