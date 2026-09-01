import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const PRODUCT_SELECT = `
  id, sku, name, slug, short_description, description,
  category_id, subcategory_id, brand_id,
  price, sale_price, stock, low_stock_threshold, status,
  is_featured, is_best_seller, is_new_arrival,
  weight, dimensions, warranty, tags, specifications,
  seo_title, seo_description, rating, review_count,
  created_at, updated_at,
  images:product_images(id, url, is_primary, sort_order),
  category:categories(id, name, slug),
  brand:brands(id, name, slug)
`

export interface ProductQuery {
  categorySlug?: string
  brandId?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  minRating?: number
  onSale?: boolean
  featured?: boolean
  bestSeller?: boolean
  newArrival?: boolean
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popularity'
  page?: number
  pageSize?: number
}

function withPrimary(p: any) {
  if (!p) return p
  const imgs = (p.images || []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const primary = imgs.find((i: any) => i.is_primary) || imgs[0]
  return { ...p, images: imgs, primary_image: primary?.url || null }
}

export const productService = {
  async list(q: ProductQuery = {}) {
    if (!isSupabaseConfigured) return { items: [], total: 0 }
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 12
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('products')
      .select(PRODUCT_SELECT, { count: 'exact' })
      .eq('status', 'published')

    if (q.categorySlug) {
      const { data: cat } = await supabase.from('categories').select('id').eq('slug', q.categorySlug).maybeSingle()
      if (cat) query = query.eq('category_id', cat.id)
      else return { items: [], total: 0 }
    }
    if (q.brandId) query = query.eq('brand_id', q.brandId)
    if (q.search) query = query.or(`name.ilike.%${q.search}%,sku.ilike.%${q.search}%,short_description.ilike.%${q.search}%`)
    if (q.minPrice != null) query = query.gte('price', q.minPrice)
    if (q.maxPrice != null) query = query.lte('price', q.maxPrice)
    if (q.inStock) query = query.gt('stock', 0)
    if (q.minRating != null) query = query.gte('rating', q.minRating)
    if (q.onSale) query = query.not('sale_price', 'is', null)
    if (q.featured) query = query.eq('is_featured', true)
    if (q.bestSeller) query = query.eq('is_best_seller', true)
    if (q.newArrival) query = query.eq('is_new_arrival', true)

    switch (q.sort) {
      case 'price_asc': query = query.order('price', { ascending: true }); break
      case 'price_desc': query = query.order('price', { ascending: false }); break
      case 'rating': query = query.order('rating', { ascending: false }); break
      case 'popularity': query = query.order('review_count', { ascending: false }); break
      case 'newest':
      default: query = query.order('created_at', { ascending: false })
    }

    const { data, count, error } = await query.range(from, to)
    if (error) throw error
    return { items: (data || []).map(withPrimary), total: count || 0 }
  },

  async getBySlug(slug: string) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase
      .from('products')
      .select(`${PRODUCT_SELECT}, specs:product_specifications(id, name, value, sort_order), variants:product_variants(id, name, value, price_delta, stock)`)
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw error
    return withPrimary(data)
  },

  async related(categoryId: string, excludeId: string, limit = 4) {
    if (!isSupabaseConfigured || !categoryId) return []
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('status', 'published')
      .eq('category_id', categoryId)
      .neq('id', excludeId)
      .limit(limit)
    return (data || []).map(withPrimary)
  },

  async suggest(term: string, limit = 6) {
    if (!isSupabaseConfigured || !term) return []
    const { data } = await supabase
      .from('products')
      .select('id, name, slug, price, sale_price, images:product_images(url, is_primary)')
      .eq('status', 'published')
      .or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
      .limit(limit)
    return (data || []).map(withPrimary)
  },
}
