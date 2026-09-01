import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { useWishlistStore } from '@/store/wishlistStore'
import { useCartStore } from '@/store/cartStore'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { PriceTag } from '@/components/common/PriceTag'

export default function Wishlist() {
  const user = useAuthStore((s) => s.user)
  const items = useWishlistStore((s) => s.items)
  const load = useWishlistStore((s) => s.load)
  const toggle = useWishlistStore((s) => s.toggle)
  const addToCart = useCartStore((s) => s.add)

  useEffect(() => { if (user) load(user.id) }, [user])

  const moveToCart = (p: any) => { addToCart(p, 1); toggle(p.id); toast.success('Moved to cart') }

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6">My Wishlist</h1>
      {items.length === 0 ? (
        <EmptyState icon={Heart} title="Your wishlist is empty" description="Save products you love to buy them later." action={<Link to="/products" className="btn-primary">Discover Products</Link>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((w: any) => w.product && (
            <div key={w.id} className="card p-4 flex gap-4" data-testid={`wishlist-item-${w.product.slug}`}>
              <Link to={`/products/${w.product.slug}`}><img src={w.product.primary_image || '/logo-icon.png'} className="w-24 h-24 rounded-xl object-cover bg-warm" alt="" /></Link>
              <div className="flex-1 min-w-0">
                <Link to={`/products/${w.product.slug}`} className="font-medium line-clamp-2 hover:text-brand">{w.product.name}</Link>
                <div className="mt-2"><PriceTag price={w.product.price} salePrice={w.product.sale_price} size="sm" /></div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => moveToCart(w.product)} disabled={w.product.stock <= 0} data-testid={`move-cart-${w.product.slug}`}><ShoppingBag className="w-4 h-4" /> Move to Cart</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle(w.product.id)}>Remove</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
