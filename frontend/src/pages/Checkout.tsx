import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Plus, QrCode, MessageCircle, Check, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Seo } from '@/components/common/Seo'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddressForm } from '@/components/account/AddressForm'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { addressService } from '@/services/addressService'
import { settingsService } from '@/services/settingsService'
import { couponService } from '@/services/couponService'
import { orderService } from '@/services/orderService'
import { effectivePrice, formatINR } from '@/lib/utils'

export default function Checkout() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const clear = useCartStore((s) => s.clear)

  const [selectedAddr, setSelectedAddr] = useState<string | null>(null)
  const [addingAddr, setAddingAddr] = useState(false)
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [placingOrder, setPlacingOrder] = useState(false)

  const { data: addresses = [], refetch } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => addressService.list(user!.id),
    enabled: !!user,
  })
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.get(),
  })

  useEffect(() => {
    if (addresses.length && !selectedAddr) {
      setSelectedAddr(addresses.find((a: any) => a.is_default)?.id || addresses[0].id)
    }
  }, [addresses])

  const freeThreshold = settings?.free_shipping_threshold ?? 999
  const shipping = subtotal >= freeThreshold ? 0 : settings?.shipping_fee ?? 79
  const tax = Math.round(((subtotal - discount) * (settings?.tax_percent ?? 0)) / 100)
  const total = Math.max(0, subtotal - discount) + shipping + tax
  const address = useMemo(() => addresses.find((a: any) => a.id === selectedAddr), [addresses, selectedAddr])

  if (!user) {
    return (
      <div className="container-x">
        <Seo title="Checkout" />
        <EmptyState
          title="Please log in to checkout"
          description="Sign in to continue securely."
          action={<Link to="/login" className="btn-primary">Login</Link>}
        />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container-x">
        <Seo title="Checkout" />
        <EmptyState
          title="Your cart is empty"
          description="Add products before checking out."
          action={<Link to="/products" className="btn-primary">Shop Now</Link>}
        />
      </div>
    )
  }

  const applyCoupon = async () => {
    if (!code.trim()) return
    const res = await couponService.validate(code, subtotal, user.id)
    if (res.valid) {
      setDiscount(res.discount)
      setAppliedCode(code.trim().toUpperCase())
      toast.success('Coupon applied')
    } else {
      setDiscount(0)
      setAppliedCode(null)
      toast.error(res.message || 'Invalid coupon')
    }
  }

  const placeOrder = async () => {
    if (!address) {
      toast.error('Please select a delivery address')
      return
    }

    setPlacingOrder(true)
    try {
      // 1. Create order in real Supabase database (server calculates authoritative price & totals)
      const res = await orderService.createManualOrder({
        userId: user.id,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        address,
        coupon_code: appliedCode,
      })

      // 2. Clear customer's local and server cart
      clear()

      // 3. Format & trigger WhatsApp order confirmation message to 917010586606
      const waUrl = orderService.generateWhatsAppOrderUrl({
        order_number: res.order_number,
        address,
        items,
        subtotal: res.breakdown.subtotal,
        shipping: res.breakdown.shipping,
        discount: res.breakdown.discount,
        total: res.breakdown.total,
      })

      try {
        window.open(waUrl, '_blank', 'noopener,noreferrer')
      } catch {
        // Fallback handled on order detail page
      }

      toast.success('Order placed successfully! Complete your UPI payment below.')
      navigate(`/account/orders/${res.order_id}`)
    } catch (e: any) {
      toast.error(e.message || 'Could not place order')
    } finally {
      setPlacingOrder(false)
    }
  }

  return (
    <>
      <Seo title="Checkout" />
      <div className="container-x py-8 md:py-12">
        <h1 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mb-8">Checkout</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Address */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand" /> Delivery Address
                </h3>
                <button
                  onClick={() => setAddingAddr((v) => !v)}
                  className="text-brand font-semibold text-sm flex items-center gap-1"
                  data-testid="add-address-toggle"
                >
                  <Plus className="w-4 h-4" /> New
                </button>
              </div>
              {addingAddr && (
                <div className="mb-4">
                  <AddressForm
                    userId={user.id}
                    onDone={() => {
                      setAddingAddr(false)
                      refetch()
                    }}
                    onCancel={() => setAddingAddr(false)}
                  />
                </div>
              )}
              {addresses.length === 0 && !addingAddr ? (
                <p className="text-ink-muted text-sm">No saved addresses. Add one to continue.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {addresses.map((a: any) => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAddr(a.id)}
                      className={`text-left p-4 rounded-2xl border-2 transition-colors ${
                        selectedAddr === a.id ? 'border-brand bg-brand-light/40' : 'border-line hover:border-brand/50'
                      }`}
                      data-testid={`address-${a.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">{a.full_name}</span>
                        {selectedAddr === a.id && <Check className="w-4 h-4 text-brand" />}
                      </div>
                      <p className="text-sm text-ink-muted mt-1">
                        {a.line1}, {a.line2 && `${a.line2}, `}
                        {a.city}, {a.state} — {a.pincode}
                      </p>
                      <p className="text-sm text-ink-muted">{a.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="card p-6">
              <h3 className="font-heading font-semibold text-lg mb-4">Order Items ({items.length})</h3>
              <div className="space-y-3">
                {items.map((i) => (
                  <div key={i.product_id} className="flex items-center gap-3">
                    <img
                      src={i.product.primary_image || '/logo-icon.png'}
                      className="w-14 h-14 rounded-xl object-cover bg-warm"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{i.product.name}</p>
                      <p className="text-xs text-ink-muted">Qty {i.quantity}</p>
                    </div>
                    <span className="font-semibold">{formatINR(effectivePrice(i.product) * i.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary + Pay */}
          <div className="lg:sticky lg:top-40 self-start space-y-4">
            <div className="card p-6 space-y-4">
              <h3 className="font-heading font-semibold text-lg">Payment Summary</h3>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Coupon"
                  className="input-field py-2.5 uppercase"
                  data-testid="checkout-coupon"
                />
                <Button onClick={applyCoupon} variant="secondary" size="sm">Apply</Button>
              </div>
              {appliedCode && <p className="text-sm text-green-600">✓ {appliedCode} applied</p>}
              <div className="space-y-2.5 text-sm border-t border-line pt-4">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Subtotal</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>− {formatINR(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-ink-muted">Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : formatINR(shipping)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Tax</span>
                    <span>{formatINR(tax)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-line pt-4">
                <span className="font-semibold">Total</span>
                <span className="font-heading font-bold text-2xl" data-testid="checkout-total">{formatINR(total)}</span>
              </div>

              <div className="p-3 bg-warm rounded-xl text-xs text-ink-muted space-y-1.5">
                <div className="flex items-center gap-1.5 font-medium text-ink">
                  <QrCode className="w-4 h-4 text-brand" />
                  Manual UPI QR Payment
                </div>
                <p>
                  Place order to generate your Order ID, view UPI QR code, and open WhatsApp order notification to <strong>7010586606</strong>.
                </p>
              </div>

              <Button
                onClick={placeOrder}
                loading={placingOrder}
                disabled={!address}
                fullWidth
                size="lg"
                data-testid="place-order-btn"
              >
                <QrCode className="w-5 h-5" /> Place Order & Pay via UPI
              </Button>
              <p className="text-xs text-ink-muted flex items-center gap-1.5 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-brand" /> Verified with MY HARDWARES WhatsApp & UPI
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
