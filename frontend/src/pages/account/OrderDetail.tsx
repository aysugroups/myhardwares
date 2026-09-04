import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Package, MessageCircle } from 'lucide-react'
import { orderService } from '@/services/orderService'
import { OrderTimeline } from '@/components/account/OrderTimeline'
import { UpiPaymentSection } from '@/components/account/UpiPaymentSection'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { STATUS_COLOR, ORDER_STATUS_LABEL } from '@/lib/constants'
import { formatINR, formatDateTime } from '@/lib/utils'

export default function OrderDetail() {
  const { id = '' } = useParams()
  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getById(id),
  })

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>
  if (!order) return <EmptyState icon={Package} title="Order not found" description="This order doesn't exist or you don't have access." action={<Link to="/account/orders" className="btn-primary">Back to orders</Link>} />

  const addr = order.address || {}

  const openWhatsApp = () => {
    const url = orderService.generateWhatsAppOrderUrl(order)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      <Link to="/account/orders" className="text-ink-muted hover:text-brand flex items-center gap-1 text-sm mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to orders
      </Link>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl tracking-tight" data-testid="order-number">{order.order_number}</h1>
          <p className="text-ink-muted text-sm">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`chip ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            Payment: {order.payment_status.toUpperCase()}
          </span>
          <span className={`chip ${STATUS_COLOR[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
        </div>
      </div>

      {/* Manual UPI QR Payment Section (shown for pending orders or payment verification) */}
      <div className="mb-6">
        <UpiPaymentSection order={order} onConfirmed={() => refetch()} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-heading font-semibold mb-4">Order Tracking</h3>
            <OrderTimeline status={order.status} history={order.history} />
            {order.tracking_number && <p className="text-sm mt-4 pt-4 border-t border-line">Tracking Number: <strong>{order.tracking_number}</strong></p>}
          </div>
          <div className="card p-6">
            <h3 className="font-heading font-semibold mb-4">Items</h3>
            <div className="space-y-3">
              {order.items.map((it: any) => (
                <div key={it.id} className="flex items-center gap-3">
                  <img src={it.image_url || '/logo-icon.png'} className="w-14 h-14 rounded-xl object-cover bg-warm" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{it.product_name}</p>
                    <p className="text-xs text-ink-muted">SKU {it.sku} • Qty {it.quantity}</p>
                  </div>
                  <span className="font-semibold">{formatINR(it.line_total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-heading font-semibold mb-3">Delivery Address</h3>
            <p className="text-sm text-ink font-medium">{addr.full_name}</p>
            <p className="text-sm text-ink-muted mt-1">{addr.line1}, {addr.line2 && `${addr.line2}, `}{addr.city}, {addr.state} — {addr.pincode}</p>
            <p className="text-sm text-ink-muted">{addr.phone}</p>
          </div>
          <div className="card p-6 space-y-2.5 text-sm">
            <h3 className="font-heading font-semibold mb-1">Payment Summary</h3>
            <div className="flex justify-between"><span className="text-ink-muted">Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount {order.coupon_code && `(${order.coupon_code})`}</span><span>− {formatINR(order.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-ink-muted">Shipping</span><span>{order.shipping === 0 ? 'FREE' : formatINR(order.shipping)}</span></div>
            {order.tax > 0 && <div className="flex justify-between"><span className="text-ink-muted">Tax</span><span>{formatINR(order.tax)}</span></div>}
            <div className="flex justify-between border-t border-line pt-2 font-semibold"><span>Total</span><span className="font-heading font-bold">{formatINR(order.total)}</span></div>
            
            <div className="pt-3 border-t border-line">
              <button
                onClick={openWhatsApp}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition"
              >
                <MessageCircle className="w-4 h-4" /> Open in WhatsApp (7010586606)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
