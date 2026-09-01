import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Minus, Plus, Trash2, ShoppingBag, Tag, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Seo } from '@/components/common/Seo'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { couponService } from '@/services/couponService'
import { settingsService } from '@/services/settingsService'
import { effectivePrice, formatINR } from '@/lib/utils'

export default function Cart() {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const setQty = useCartStore((s) => s.setQty)
  const remove = useCartStore((s) => s.remove)
  const user = useAuthStore((s) => s.user)
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => settingsService.get() })

  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [appliedCode, setAppliedCode] = useState<string | null>(null)

  const freeThreshold = settings?.free_shipping_threshold ?? 999
  const shipping = subtotal >= freeThreshold || subtotal === 0 ? 0 : settings?.shipping_fee ?? 79
  const tax = Math.round(((subtotal - discount) * (settings?.tax_percent ?? 0)) / 100)
  const total = Math.max(0, subtotal - discount) + shipping + tax

  const applyCoupon = async () => {
    if (!code.trim()) return
    setApplying(true)
    const res = await couponService.validate(code, subtotal, user?.id)
    setApplying(false)
    if (res.valid) { setDiscount(res.discount); setAppliedCode(code.trim().toUpperCase()); toast.success(res.message || 'Coupon applied') }
    else { setDiscount(0); setAppliedCode(null); toast.error(res.message || 'Invalid coupon') }
  }

  if (items.length === 0) {
    return (
      <div className="container-x">
        <Seo title="Cart" />
        <EmptyState icon={ShoppingBag} title="Your cart is empty" description="Looks like you haven't added anything yet." action={<Link to="/products" className="btn-primary">Start Shopping</Link>} />
      </div>
    )
  }

  return (
    <>
      <Seo title="Cart" />
      <div className="container-x py-8 md:py-12">
        <h1 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mb-8">Your Cart</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((i) => (
              <div key={i.product_id} className="card p-4 flex gap-4" data-testid={`cart-row-${i.product.slug}`}>
                <img src={i.product.primary_image || '/logo-icon.png'} alt={i.product.name} className="w-24 h-24 rounded-xl object-cover bg-warm shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-3">
                    <Link to={`/products/${i.product.slug}`} className="font-medium text-ink hover:text-brand line-clamp-2">{i.product.name}</Link>
                    <button onClick={() => remove(i.product_id)} className="text-ink-muted hover:text-red-500 shrink-0" data-testid={`remove-${i.product.slug}`}><Trash2 className="w-5 h-5" /></button>
                  </div>
                  {i.product.brand?.name && <p className="text-xs text-brand font-semibold uppercase mt-0.5">{i.product.brand.name}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-line rounded-full">
                      <button onClick={() => setQty(i.product_id, i.quantity - 1)} className="p-2 text-ink-muted hover:text-brand"><Minus className="w-4 h-4" /></button>
                      <span className="w-9 text-center font-semibold text-sm">{i.quantity}</span>
                      <button onClick={() => setQty(i.product_id, i.quantity + 1)} disabled={i.quantity >= i.product.stock} className="p-2 text-ink-muted hover:text-brand disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                    </div>
                    <span className="font-heading font-bold text-lg">{formatINR(effectivePrice(i.product) * i.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:sticky lg:top-40 self-start">
            <div className="card p-6 space-y-4">
              <h3 className="font-heading font-semibold text-lg">Order Summary</h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className="input-field pl-9 py-2.5 uppercase" data-testid="coupon-input" />
                </div>
                <Button onClick={applyCoupon} loading={applying} variant="secondary" size="sm" data-testid="apply-coupon">Apply</Button>
              </div>
              {appliedCode && <p className="text-sm text-green-600">✓ {appliedCode} applied</p>}
              <div className="space-y-2.5 text-sm border-t border-line pt-4">
                <Row label="Subtotal" value={formatINR(subtotal)} />
                {discount > 0 && <Row label="Discount" value={`− ${formatINR(discount)}`} className="text-green-600" />}
                <Row label="Shipping" value={shipping === 0 ? 'FREE' : formatINR(shipping)} />
                {tax > 0 && <Row label="Tax" value={formatINR(tax)} />}
              </div>
              <div className="flex items-center justify-between border-t border-line pt-4">
                <span className="font-semibold">Total</span>
                <span className="font-heading font-bold text-2xl" data-testid="cart-total">{formatINR(total)}</span>
              </div>
              {subtotal < freeThreshold && <p className="text-xs text-ink-muted">Add {formatINR(freeThreshold - subtotal)} more for FREE shipping.</p>}
              <Button onClick={() => navigate('/checkout')} fullWidth size="lg" data-testid="proceed-checkout">Proceed to Checkout <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Row({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return <div className={`flex justify-between ${className}`}><span className="text-ink-muted">{label}</span><span className="font-medium">{value}</span></div>
}
