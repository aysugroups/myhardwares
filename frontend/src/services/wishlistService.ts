import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const wishlistService = {
  async list(userId: string) {
    if (!isSupabaseConfigured || !userId) return []
    const { data } = await supabase
      .from('wishlist_items')
      .select('id, product_id, created_at, product:products(id, name, slug, price, sale_price, stock, rating, review_count, images:product_images(url, is_primary), brand:brands(name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return (data || []).map((w: any) => ({
      ...w,
      product: w.product
        ? { ...w.product, primary_image: (w.product.images || []).find((i: any) => i.is_primary)?.url || w.product.images?.[0]?.url || null }
        : null,
    }))
  },
  async add(userId: string, productId: string) {
    const { error } = await supabase.from('wishlist_items').upsert(
      { user_id: userId, product_id: productId },
      { onConflict: 'user_id,product_id' },
    )
    if (error) throw error
  },
  async remove(userId: string, productId: string) {
    const { error } = await supabase.from('wishlist_items').delete().eq('user_id', userId).eq('product_id', productId)
    if (error) throw error
  },
}
