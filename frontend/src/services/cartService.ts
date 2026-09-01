import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// Server-side cart (per authenticated user). Guest cart lives in localStorage via cartStore.
export const cartService = {
  async list(userId: string) {
    if (!isSupabaseConfigured || !userId) return []
    const { data } = await supabase
      .from('cart_items')
      .select('id, quantity, product:products(id, name, slug, price, sale_price, stock, images:product_images(url, is_primary), brand:brands(name))')
      .eq('user_id', userId)
    return (data || []).map((r: any) => ({
      product_id: r.product?.id,
      quantity: r.quantity,
      product: r.product
        ? { ...r.product, primary_image: (r.product.images || []).find((i: any) => i.is_primary)?.url || r.product.images?.[0]?.url || null }
        : null,
    })).filter((r: any) => r.product)
  },
  async upsert(userId: string, productId: string, quantity: number) {
    const { error } = await supabase.from('cart_items').upsert(
      { user_id: userId, product_id: productId, quantity },
      { onConflict: 'user_id,product_id' },
    )
    if (error) throw error
  },
  async remove(userId: string, productId: string) {
    await supabase.from('cart_items').delete().eq('user_id', userId).eq('product_id', productId)
  },
  async clear(userId: string) {
    await supabase.from('cart_items').delete().eq('user_id', userId)
  },
}
