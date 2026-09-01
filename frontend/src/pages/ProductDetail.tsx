import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Heart, ShoppingBag, Minus, Plus, Truck, RefreshCw, ShieldCheck, ChevronRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Seo } from '@/components/common/Seo'
import { Rating } from '@/components/ui/Rating'
import { PriceTag } from '@/components/common/PriceTag'
import { Button } from '@/components/ui/Button'
import { ProductGrid } from '@/components/product/ProductGrid'
import { Reveal } from '@/components/common/Reveal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { productService } from '@/services/productService'
import { reviewService } from '@/services/reviewService'
import { useCartStore } from '@/store/cartStore'
import { useWishlistStore } from '@/store/wishlistStore'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { effectivePrice, stockLabel, formatDate } from '@/lib/utils'

const TABS = ['Description', 'Specifications', 'Shipping & Returns', 'Reviews'] as const

export default function ProductDetail() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Description')

  const { data: product, isLoading } = useQuery({ queryKey: ['product', slug], queryFn: () => productService.getBySlug(slug) })
  const { data: related = [] } = useQuery({ queryKey: ['related', product?.id], queryFn: () => productService.related(product.category_id, product.id), enabled: !!product?.id })
  const { data: reviews = [] } = useQuery({ queryKey: ['reviews', product?.id], queryFn: () => reviewService.forProduct(product.id), enabled: !!product?.id })

  const add = useCartStore((s) => s.add)
  const setCartOpen = useUIStore((s) => s.setCartOpen)
  const user = useAuthStore((s) => s.user)
  const has = useWishlistStore((s) => (product ? s.ids.has(product.id) : false))
  const toggle = useWishlistStore((s) => s.toggle)

  useEffect(() => { setQty(1); setActiveImg(0); setTab('Description') }, [slug])

  if (isLoading) {
    return (
      <div className="container-x py-10 grid lg:grid-cols-2 gap-10">
        <Skeleton className="aspect-square" />
        <div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-24" /><Skeleton className="h-12 w-full" /></div>
      </div>
    )
  }
  if (!product) return <div className="container-x"><EmptyState title="Product not found" description="This product may have been removed." action={<Link to="/products" className="btn-primary">Browse products</Link>} /></div>

  const images = product.images?.length ? product.images : [{ url: product.primary_image }]
  const stock = stockLabel(product.stock, product.low_stock_threshold)
  const eff = effectivePrice(product)

  const doAdd = (open = true) => {
    if (stock === 'out') return
    add(product, qty)
    toast.success(`${product.name} added to cart`)
    if (open) setCartOpen(true)
  }
  const buyNow = () => { doAdd(false); navigate('/checkout') }
  const onWish = async () => {
    if (!user) { toast.error('Please log in to save items'); navigate('/login'); return }
    const added = await toggle(product.id)
    toast[added ? 'success' : 'message'](added ? 'Added to wishlist' : 'Removed from wishlist')
  }

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, sku: product.sku,
    description: product.short_description, brand: product.brand?.name,
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: eff, availability: stock === 'out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' },
    ...(product.review_count ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.review_count } } : {}),
  }

  return (
    <>
      <Seo title={product.seo_title || product.name} description={product.seo_description || product.short_description} image={product.primary_image} jsonLd={jsonLd} />
      <div className="container-x py-6 md:py-10">
        <nav className="text-sm text-ink-muted flex items-center gap-1.5 mb-6 flex-wrap">
          <Link to="/" className="hover:text-brand">Home</Link><ChevronRight className="w-3.5 h-3.5" />
          <Link to="/products" className="hover:text-brand">Products</Link><ChevronRight className="w-3.5 h-3.5" />
          {product.category && <><Link to={`/category/${product.category.slug}`} className="hover:text-brand">{product.category.name}</Link><ChevronRight className="w-3.5 h-3.5" /></>}
          <span className="text-ink line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Gallery */}
          <div className="lg:sticky lg:top-40 self-start">
            <motion.div key={activeImg} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="relative aspect-square rounded-3xl overflow-hidden bg-warm border border-gray-100 group">
              {images[activeImg]?.url ? (
                <img src={images[activeImg].url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : <div className="w-full h-full flex items-center justify-center text-ink-muted">No image</div>}
            </motion.div>
            {images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto no-scrollbar">
                {images.map((im: any, i: number) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 ${i === activeImg ? 'border-brand' : 'border-line'}`} data-testid={`thumb-${i}`}>
                    <img src={im.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            {product.brand?.name && <p className="text-sm font-semibold uppercase tracking-wide text-brand">{product.brand.name}</p>}
            <h1 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mt-1">{product.name}</h1>
            <div className="flex items-center gap-4 mt-3">
              <Rating value={product.rating || 0} count={product.review_count} />
              <span className="text-sm text-ink-muted">SKU: {product.sku}</span>
            </div>
            <div className="mt-5"><PriceTag price={product.price} salePrice={product.sale_price} size="lg" /></div>
            <p className="text-ink-muted mt-4">{product.short_description}</p>

            <div className="mt-5">
              {stock === 'in' && <span className="chip bg-green-100 text-green-700"><Check className="w-3.5 h-3.5" /> In Stock</span>}
              {stock === 'low' && <span className="chip bg-amber-100 text-amber-700">Low Stock — only {product.stock} left</span>}
              {stock === 'out' && <span className="chip bg-gray-200 text-gray-600">Currently unavailable</span>}
            </div>

            {stock !== 'out' && (
              <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center border border-line rounded-full">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 text-ink-muted hover:text-brand" data-testid="qty-dec"><Minus className="w-4 h-4" /></button>
                  <span className="w-10 text-center font-semibold" data-testid="qty-value">{qty}</span>
                  <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="p-3 text-ink-muted hover:text-brand disabled:opacity-30" disabled={qty >= product.stock} data-testid="qty-inc"><Plus className="w-4 h-4" /></button>
                </div>
                <span className="text-sm text-ink-muted">{product.stock} available</span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3 mt-6">
              <Button onClick={() => doAdd()} disabled={stock === 'out'} size="lg" variant="secondary" data-testid="add-to-cart-btn"><ShoppingBag className="w-5 h-5" /> Add to Cart</Button>
              <Button onClick={buyNow} disabled={stock === 'out'} size="lg" data-testid="buy-now-btn">Buy Now</Button>
            </div>
            <button onClick={onWish} className="flex items-center gap-2 mt-4 text-ink-muted hover:text-brand" data-testid="wishlist-detail-btn">
              <Heart className={has ? 'w-5 h-5 fill-brand text-brand' : 'w-5 h-5'} /> {has ? 'Saved to wishlist' : 'Add to wishlist'}
            </button>

            <div className="grid grid-cols-3 gap-3 mt-8">
              {[{ i: Truck, t: 'Fast Delivery' }, { i: ShieldCheck, t: product.warranty || 'Genuine Product' }, { i: RefreshCw, t: 'Easy Returns' }].map((f, i) => (
                <div key={i} className="card p-4 text-center"><f.i className="w-5 h-5 text-brand mx-auto mb-2" strokeWidth={1.5} /><p className="text-xs text-ink-muted">{f.t}</p></div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-14">
          <div className="flex gap-2 border-b border-line overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-5 py-3 font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink'}`} data-testid={`tab-${t}`}>
                {t}{t === 'Reviews' ? ` (${reviews.length})` : ''}
              </button>
            ))}
          </div>
          <div className="py-8 max-w-3xl">
            {tab === 'Description' && <p className="text-ink-muted whitespace-pre-line leading-relaxed">{product.description || product.short_description || 'No description available.'}</p>}
            {tab === 'Specifications' && (
              (product.specs?.length || product.specifications) ? (
                <table className="w-full text-sm">
                  <tbody>
                    {(product.specs || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((s: any) => (
                      <tr key={s.id} className="border-b border-line"><td className="py-3 font-medium text-ink w-1/3">{s.name}</td><td className="py-3 text-ink-muted">{s.value}</td></tr>
                    ))}
                    {product.specifications && Object.entries(product.specifications).map(([k, v]: any) => (
                      <tr key={k} className="border-b border-line"><td className="py-3 font-medium text-ink w-1/3 capitalize">{k}</td><td className="py-3 text-ink-muted">{String(v)}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-ink-muted">No specifications listed.</p>
            )}
            {tab === 'Shipping & Returns' && (
              <div className="space-y-3 text-ink-muted">
                <p><strong className="text-ink">Shipping:</strong> Dispatched within 24–48 hours. Standard delivery in 3–5 business days across India.</p>
                <p><strong className="text-ink">Returns:</strong> Eligible products can be returned within 7 days of delivery in original condition.</p>
                <p><strong className="text-ink">Warranty:</strong> {product.warranty || 'As per manufacturer terms.'}</p>
              </div>
            )}
            {tab === 'Reviews' && (
              reviews.length === 0 ? <p className="text-ink-muted">No reviews yet. Verified buyers can review this product after purchase.</p> : (
                <div className="space-y-5">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="card p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3"><span className="font-semibold text-ink">{r.profile?.full_name || 'Customer'}</span>{r.is_verified && <span className="chip bg-green-100 text-green-700 text-[10px]">Verified Purchase</span>}</div>
                        <span className="text-xs text-ink-muted">{formatDate(r.created_at)}</span>
                      </div>
                      <div className="mt-2"><Rating value={r.rating} showCount={false} /></div>
                      {r.title && <p className="font-semibold text-ink mt-2">{r.title}</p>}
                      <p className="text-ink-muted mt-1">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-10">
            <Reveal><h2 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-8">Related Products</h2></Reveal>
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </>
  )
}
