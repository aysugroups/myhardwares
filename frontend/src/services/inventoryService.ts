import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const inventoryService = {
  async lowStock(threshold?: number) {
    if (!isSupabaseConfigured) return []
    const { data } = await supabase
      .from('products')
      .select('id, name, sku, stock, low_stock_threshold')
      .order('stock', { ascending: true })
    return (data || []).filter((p: any) => p.stock <= (threshold ?? p.low_stock_threshold ?? 5))
  },
  async adjust(productId: string, change: number, reason: string, note?: string) {
    // Atomic adjustment via RPC (prevents negative stock, logs transaction).
    const { data, error } = await supabase.rpc('adjust_inventory', {
      p_product_id: productId,
      p_change: change,
      p_reason: reason,
      p_note: note || null,
    })
    if (error) throw error
    return data
  },
  async transactions(productId?: string) {
    if (!isSupabaseConfigured) return []
    let q = supabase
      .from('inventory_transactions')
      .select('id, product_id, change, reason, note, created_at, product:products(name, sku)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (productId) q = q.eq('product_id', productId)
    const { data } = await q
    return data || []
  },
}
