import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useUIStore } from '@/store/uiStore'
import { effectivePrice, formatINR } from '@/lib/utils'

export function CartDrawer() {
  const navigate = useNavigate()
  const open = useUIStore((s) => s.cartOpen)
  const setOpen = useUIStore((s) => s.setCartOpen)
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const setQty = useCartStore((s) => s.setQty)
  const remove = useCartStore((s) => s.remove)

  const go = (path: string) => { setOpen(false); navigate(path) }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white flex flex-col shadow-dropdown"
            data-testid="cart-drawer"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="font-heading font-semibold text-lg flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-brand" /> Your Cart</h3>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-warm" data-testid="cart-close"><X className="w-5 h-5" /></button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="w-20 h-20 rounded-3xl bg-brand-light flex items-center justify-center mb-5"><ShoppingBag className="w-9 h-9 text-brand" strokeWidth={1.5} /></div>
                <h4 className="font-heading font-semibold text-lg">Your cart is empty</h4>
                <p className="text-ink-muted mt-1 mb-6">Add some premium hardware to get started.</p>
                <button onClick={() => go('/products')} className="btn-primary" data-testid="cart-shop-now">Shop Now</button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {items.map((i) => (
                    <div key={i.product_id} className="flex gap-3" data-testid={`cart-item-${i.product.slug}`}>
                      <img src={i.product.primary_image || '/logo-icon.png'} alt={i.product.name} className="w-20 h-20 rounded-xl object-cover bg-warm shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Link to={`/products/${i.product.slug}`} onClick={() => setOpen(false)} className="text-sm font-medium text-ink line-clamp-2 hover:text-brand">{i.product.name}</Link>
                        <p className="text-brand font-semibold mt-1">{formatINR(effectivePrice(i.product))}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center border border-line rounded-full">
                            <button onClick={() => setQty(i.product_id, i.quantity - 1)} className="p-1.5 text-ink-muted hover:text-brand" data-testid={`cart-dec-${i.product.slug}`}><Minus className="w-3.5 h-3.5" /></button>
                            <span className="w-7 text-center text-sm font-semibold">{i.quantity}</span>
                            <button onClick={() => setQty(i.product_id, i.quantity + 1)} disabled={i.quantity >= i.product.stock} className="p-1.5 text-ink-muted hover:text-brand disabled:opacity-30" data-testid={`cart-inc-${i.product.slug}`}><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                          <button onClick={() => remove(i.product_id)} className="text-ink-muted hover:text-red-500" data-testid={`cart-remove-${i.product.slug}`}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-line p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Subtotal</span>
                    <span className="font-heading font-bold text-xl" data-testid="cart-subtotal">{formatINR(subtotal)}</span>
                  </div>
                  <p className="text-xs text-ink-muted">Shipping &amp; taxes calculated at checkout.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => go('/cart')} className="btn-secondary" data-testid="view-cart-btn">View Cart</button>
                    <button onClick={() => go('/checkout')} className="btn-primary" data-testid="checkout-btn">Checkout</button>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
