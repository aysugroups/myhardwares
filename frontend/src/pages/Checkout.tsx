import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Plus, CreditCard, ShieldCheck, Check, AlertTriangle } from 'lucide-react'
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
import { paymentService } from '@/services/paymentService'
import { loadRazorpay } from '@/lib/razorpay'
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
  const [paying, setPaying] = useState(false)

  const { data: addresses = [], refetch } = useQuery({ queryKey: ['addresses', user?.id], queryFn: () => addressService.list(user!.id), enabled: !!user })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => settingsService.get() })

  useEffect(() => {
    if (addresses.length && !selectedAddr) setSelectedAddr(addresses.find((a: any) => a.is_default)?.id || addresses[0].id)
  }, [addresses])

  const freeThreshold = settings?.free_shipping_threshold ?? 999
  const shipping = subtotal >= freeThreshold ? 0 : settings?.shipping_fee ?? 79
  const tax = Math.round(((subtotal - discount) * (settings?.tax_percent ?? 0)) / 100)
  const total = Math.max(0, subtotal - discount) + shipping + tax
  const address = useMemo(() => addresses.find((a: any) => a.id === selectedAddr), [addresses, selectedAddr])

  if (!user) {
    return <div className="container-x"><Seo title="Checkout" /><EmptyState title="Please log in to checkout" description="Sign in to continue securely." action={<Link to="/login" className="btn-primary">Login</Link>} /></div>
  }
  if (items.length === 0) {
    return <div className="container-x"><Seo title="Checkout" /><EmptyState title="Your cart is empty" description="Add products before checking out." action={<Link to="/products" className="btn-primary">Shop Now</Link>} /></div>
  }

  const applyCoupon = async () => {
    if (!code.trim()) return
    const res = await couponService.validate(code, subtotal, user.id)
    if (res.valid) { setDiscount(res.discount); setAppliedCode(code.trim().toUpperCase()); toast.success('Coupon applied') }
    else { setDiscount(0); setAppliedCode(null); toast.error(res.message || 'Invalid coupon') }
  }

  const pay = async () => {
    if (!address) { toast.error('Please select a delivery address'); return }
    if (!paymentService.isRazorpayConfigured) { toast.error('Payments not configured yet. Please add Razorpay keys.'); return }
    setPaying(true)
    try {
      const ok = await loadRazorpay()
      if (!ok) throw new Error('Could not load payment gateway')
      // Server computes the real amount; we never trust client totals.
      const order = await paymentService.createOrder({
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        address,
        coupon_code: appliedCode,
      })
      const rzp = new (window as any).Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'MY HARDWARES',
        description: 'Order payment',
        order_id: order.razorpay_order_id,
        prefill: { name: address.full_name, contact: address.phone, email: user.email },
        theme: { color: '#FF5E1A' },
        handler: async (resp: any) => {
          try {
            const res = await paymentService.verify({
              order_id: order.order_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            })
            clear()
            toast.success('Payment successful!')
            navigate(`/account/orders/${res.order_id}`)
          } catch (e: any) {
            toast.error(e.message || 'Payment verification failed')
            navigate(`/account/orders`)
          }
        },
        modal: { ondismiss: () => { paymentService.markFailed(order.order_id); setPaying(false); toast.message('Payment cancelled') } },
      })
      rzp.on('payment.failed', (r: any) => { toast.error('Payment failed: ' + (r.error?.description || '')); paymentService.markFailed(order.order_id) })
      rzp.open()
    } catch (e: any) {
      toast.error(e.message || 'Could not start payment')
    } finally {
      setPaying(false)
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
                <h3 className="font-heading font-semibold text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-brand" /> Delivery Address</h3>
                <button onClick={() => setAddingAddr((v) => !v)} className="text-brand font-semibold text-sm flex items-center gap-1" data-testid="add-address-toggle"><Plus className="w-4 h-4" /> New</button>
              </div>
              {addingAddr && (
                <div className="mb-4"><AddressForm userId={user.id} onDone={() => { setAddingAddr(false); refetch() }} onCancel={() => setAddingAddr(false)} /></div>
              )}
              {addresses.length === 0 && !addingAddr ? (
                <p className="text-ink-muted text-sm">No saved addresses. Add one to continue.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {addresses.map((a: any) => (
                    <button key={a.id} onClick={() => setSelectedAddr(a.id)} className={`text-left p-4 rounded-2xl border-2 transition-colors ${selectedAddr === a.id ? 'border-brand bg-brand-light/40' : 'border-line hover:border-brand/50'}`} data-testid={`address-${a.id}`}>
                      <div className="flex items-center justify-between"><span className="font-semibold text-ink">{a.full_name}</span>{selectedAddr === a.id && <Check className="w-4 h-4 text-brand" />}</div>
                      <p className="text-sm text-ink-muted mt-1">{a.line1}, {a.line2 && `${a.line2}, `}{a.city}, {a.state} — {a.pincode}</p>
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
                    <img src={i.product.primary_image || '/logo-icon.png'} className="w-14 h-14 rounded-xl object-cover bg-warm" alt="" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium line-clamp-1">{i.product.name}</p><p className="text-xs text-ink-muted">Qty {i.quantity}</p></div>
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
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon" className="input-field py-2.5 uppercase" data-testid="checkout-coupon" />
                <Button onClick={applyCoupon} variant="secondary" size="sm">Apply</Button>
              </div>
              {appliedCode && <p className="text-sm text-green-600">✓ {appliedCode} applied</p>}
              <div className="space-y-2.5 text-sm border-t border-line pt-4">
                <div className="flex justify-between"><span className="text-ink-muted">Subtotal</span><span>{formatINR(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>− {formatINR(discount)}</span></div>}
                <div className="flex justify-between"><span className="text-ink-muted">Shipping</span><span>{shipping === 0 ? 'FREE' : formatINR(shipping)}</span></div>
                {tax > 0 && <div className="flex justify-between"><span className="text-ink-muted">Tax</span><span>{formatINR(tax)}</span></div>}
              </div>
              <div className="flex items-center justify-between border-t border-line pt-4"><span className="font-semibold">Total</span><span className="font-heading font-bold text-2xl" data-testid="checkout-total">{formatINR(total)}</span></div>

              {!paymentService.isRazorpayConfigured && (
                <div className="flex items-start gap-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-3" data-testid="payment-pending">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> Payments are not configured yet. Add your Razorpay keys to enable checkout.
                </div>
              )}

              <Button onClick={pay} loading={paying} disabled={!address} fullWidth size="lg" data-testid="pay-now-btn"><CreditCard className="w-5 h-5" /> Pay {formatINR(total)}</Button>
              <p className="text-xs text-ink-muted flex items-center gap-1.5 justify-center"><ShieldCheck className="w-3.5 h-3.5 text-brand" /> Secured by Razorpay</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
