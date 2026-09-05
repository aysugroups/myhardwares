import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const couponService = {
  // Server-side validation via RPC to prevent client tampering.
  async validate(code: string, subtotal: number, userId?: string): Promise<{ valid: boolean; message: string; discount?: number; coupon_id?: string }> {
    if (!isSupabaseConfigured) return { valid: false, message: 'Store not configured', discount: 0 }
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: code.trim().toUpperCase(),
      p_subtotal: subtotal,
      p_user_id: userId || null,
    })
    if (error) return { valid: false, message: 'Invalid coupon', discount: 0 }
    return data as { valid: boolean; message: string; discount: number; coupon_id?: string }
  },
  async list() {
    if (!isSupabaseConfigured) return []
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    return data || []
  },
  async create(payload: any) {
    const { data, error } = await supabase.from('coupons').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id: string, payload: any) {
    const { data, error } = await supabase.from('coupons').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id: string) {
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (error) throw error
  },
}
