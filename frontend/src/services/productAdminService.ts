import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const ADMIN_PRODUCT_SELECT = `
  id, sku, name, slug, short_description, description,
  category_id, subcategory_id, brand_id,
  price, sale_price, stock, low_stock_threshold, status,
  is_featured, is_best_seller, is_new_arrival,
  weight, dimensions, warranty, tags, specifications,
  seo_title, seo_description, rating, review_count, created_at, updated_at,
  images:product_images(id, url, storage_path, is_primary, sort_order),
  category:categories(id, name), brand:brands(id, name)
`

export const productAdminService = {
  async list(opts: { search?: string; status?: string; page?: number; pageSize?: number } = {}) {
    if (!isSupabaseConfigured) return { items: [], total: 0 }
    const page = opts.page ?? 1
    const pageSize = opts.pageSize ?? 20
    const from = (page - 1) * pageSize
    let q = supabase.from('products').select(ADMIN_PRODUCT_SELECT, { count: 'exact' }).order('created_at', { ascending: false })
    if (opts.search) q = q.or(`name.ilike.%${opts.search}%,sku.ilike.%${opts.search}%`)
    if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status)
    const { data, count, error } = await q.range(from, from + pageSize - 1)
    if (error) throw error
    return { items: data || [], total: count || 0 }
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('products').select(ADMIN_PRODUCT_SELECT).eq('id', id).single()
    if (error) throw error
    return data
  },
  async create(payload: any) {
    const { data, error } = await supabase.from('products').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id: string, payload: any) {
    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
  },
  async addImage(productId: string, url: string, storagePath: string, isPrimary = false, sortOrder = 0) {
    const { data, error } = await supabase
      .from('product_images')
      .insert({ product_id: productId, url, storage_path: storagePath, is_primary: isPrimary, sort_order: sortOrder })
      .select()
      .single()
    if (error) throw error
    return data
  },
  async removeImage(id: string) {
    const { error } = await supabase.from('product_images').delete().eq('id', id)
    if (error) throw error
  },
  async setPrimaryImage(productId: string, imageId: string) {
    await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId)
    await supabase.from('product_images').update({ is_primary: true }).eq('id', imageId)
  },
}
