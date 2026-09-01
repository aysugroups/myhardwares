import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { Rating } from '@/components/ui/Rating'
import { PriceTag } from '@/components/common/PriceTag'
import { useCartStore } from '@/store/cartStore'
import { useWishlistStore } from '@/store/wishlistStore'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { stockLabel } from '@/lib/utils'

export function ProductCard({ product, index = 0 }: { product: any; index?: number }) {
  const navigate = useNavigate()
  const add = useCartStore((s) => s.add)
  const setCartOpen = useUIStore((s) => s.setCartOpen)
  const user = useAuthStore((s) => s.user)
  const has = useWishlistStore((s) => s.ids.has(product.id))
  const toggle = useWishlistStore((s) => s.toggle)

  const stock = stockLabel(product.stock, product.low_stock_threshold)
  const img = product.primary_image || product.images?.find((i: any) => i.is_primary)?.url || product.images?.[0]?.url

  const onWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('Please log in to save items')
      navigate('/login')
      return
    }
    const added = await toggle(product.id)
    toast[added ? 'success' : 'message'](added ? 'Added to wishlist' : 'Removed from wishlist')
  }

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (stock === 'out') return
    add(product, 1)
    toast.success(`${product.name} added to cart`)
    setCartOpen(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="group card overflow-hidden hover:shadow-card transition-shadow duration-300"
      data-testid={`product-card-${product.slug}`}
    >
      <Link to={`/products/${product.slug}`} className="block relative">
        <div className="relative aspect-square overflow-hidden bg-warm">
          {img ? (
            <img
              src={img}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-muted">No image</div>
          )}
          {stock === 'out' && (
            <span className="absolute top-3 left-3 chip bg-gray-900/80 text-white">Out of Stock</span>
          )}
          {stock === 'low' && (
            <span className="absolute top-3 left-3 chip bg-amber-100 text-amber-700">Low Stock</span>
          )}
          {product.is_new_arrival && stock !== 'out' && (
            <span className="absolute top-3 left-3 chip bg-brand text-white">New</span>
          )}
          <button
            onClick={onWishlist}
            aria-label="Toggle wishlist"
            data-testid={`wishlist-btn-${product.slug}`}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-soft"
          >
            <motion.span whileTap={{ scale: 0.8 }} animate={{ scale: has ? 1.15 : 1 }}>
              <Heart className={has ? 'w-4.5 h-4.5 fill-brand text-brand' : 'w-4.5 h-4.5 text-ink-muted'} style={{ width: 18, height: 18 }} />
            </motion.span>
          </button>
        </div>
      </Link>
      <div className="p-4">
        {product.brand?.name && <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-1">{product.brand.name}</p>}
        <Link to={`/products/${product.slug}`}>
          <h3 className="font-medium text-ink line-clamp-2 min-h-[2.75rem] hover:text-brand transition-colors">{product.name}</h3>
        </Link>
        <div className="mt-1.5"><Rating value={product.rating || 0} count={product.review_count} /></div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <PriceTag price={product.price} salePrice={product.sale_price} size="sm" />
          <button
            onClick={onAdd}
            disabled={stock === 'out'}
            aria-label="Add to cart"
            data-testid={`add-cart-btn-${product.slug}`}
            className="shrink-0 w-10 h-10 rounded-full bg-brand-light text-brand hover:bg-brand hover:text-white transition-colors flex items-center justify-center disabled:opacity-40 disabled:hover:bg-brand-light disabled:hover:text-brand"
          >
            <ShoppingBag className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
