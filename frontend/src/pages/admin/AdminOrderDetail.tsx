import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, CheckCircle2, Clock, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { adminService } from '@/services/adminService'
import { orderService } from '@/services/orderService'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { OrderTimeline } from '@/components/account/OrderTimeline'
import { STATUS_COLOR, ORDER_STATUS_LABEL, ORDER_STATUSES } from '@/lib/constants'
import { formatINR, formatDateTime } from '@/lib/utils'

export default function AdminOrderDetail() {
  const { id = '' } = useParams()
  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => adminService.orderById(id),
  })
  const [status, setStatus] = useState('')
  const [tracking, setTracking] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [verifyingPayment, setVerifyingPayment] = useState(false)

  useEffect(() => {
    if (order) {
      setStatus(order.status)
      setTracking(order.tracking_number || '')
    }
  }, [order])

  if (isLoading) return <Skeleton className="h-96" />
  if (!order) return <p>Order not found.</p>
  const addr = order.address || {}

  const update = async () => {
    setSaving(true)
    try {
      await adminService.updateOrderStatus(order.id, status, note, tracking)
      toast.success('Order updated')
      setNote('')
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyManualPayment = async () => {
    if (!confirm(`Verify UPI payment for order ${order.order_number}? This will atomically deduct inventory and update the status to Processing.`)) {
      return
    }

    setVerifyingPayment(true)
    try {
      await adminService.verifyManualPayment(order.id, note || 'UPI payment verified by admin')
      toast.success('Payment verified successfully! Stock deducted and status updated to Processing.')
      refetch()
    } catch (e: any) {
      toast.error(e.message || 'Payment verification failed')
    } finally {
      setVerifyingPayment(false)
    }
  }

  const openWhatsApp = () => {
    const url = orderService.generateWhatsAppOrderUrl(order)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      <Link to="/admin/orders" className="text-ink-muted hover:text-brand flex items-center gap-1 text-sm mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to orders
      </Link>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl tracking-tight">{order.order_number}</h1>
          <p className="text-ink-muted text-sm">{formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`chip ${order.payment_status === 'paid'
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
              }`}
          >
            Payment: {order.payment_status.toUpperCase()}
          </span>
          <span className={`chip ${STATUS_COLOR[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-heading font-semibold mb-4">Items</h3>
            {order.items.map((it: any) => (
              <div key={it.id} className="flex items-center gap-3 py-2">
                <img
                  src={it.image_url || '/logo-icon.png'}
                  className="w-12 h-12 rounded-xl object-cover bg-warm"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{it.product_name}</p>
                  <p className="text-xs text-ink-muted">
                    SKU {it.sku} • {formatINR(it.unit_price)} × {it.quantity}
                  </p>
                </div>
                <span className="font-semibold">{formatINR(it.line_total)}</span>
              </div>
            ))}
            <div className="border-t border-line mt-4 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Subtotal</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>− {formatINR(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-ink-muted">Shipping</span>
                <span>{formatINR(order.shipping)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-heading font-bold">{formatINR(order.total)}</span>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-heading font-semibold mb-4">Tracking Timeline</h3>
            <OrderTimeline status={order.status} history={order.history} />
          </div>
        </div>

        <div className="space-y-6">
          {/* Payment Verification Card */}
          <div className="card p-6 space-y-3" data-testid="admin-payment-card">
            <h3 className="font-heading font-semibold">Payment & Verification</h3>
            <div className="text-sm space-y-1">
              <p className="text-ink-muted">
                Status:{' '}
                <span className={`font-semibold ${order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                  {order.payment_status.toUpperCase()}
                </span>
              </p>
              <p className="text-ink-muted">
                Method: <span className="font-medium text-ink">{order.payment_method || 'UPI QR'}</span>
              </p>
              {order.payment_confirmation_requested && (
                <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded-lg flex items-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5" /> Customer requested payment confirmation
                </p>
              )}
            </div>

            {order.payment_status !== 'paid' ? (
              <div className="pt-2">
                <Button
                  onClick={handleVerifyManualPayment}
                  loading={verifyingPayment}
                  fullWidth
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-testid="verify-payment-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Verify Payment (Deduct Stock & Process)
                </Button>
                <p className="text-[11px] text-ink-muted mt-1.5 text-center">
                  Only authorized admins can verify. Stock is reduced safely and atomically.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-green-50 rounded-xl border border-green-200 text-xs text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>Payment verified. Stock was deducted upon confirmation.</span>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-heading font-semibold mb-3">Update Order Status</h3>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-field mb-3"
              data-testid="order-status-select"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
              ))}
            </select>
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Tracking number"
              className="input-field mb-3"
              data-testid="tracking-input"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="input-field mb-3"
            />
            <Button onClick={update} loading={saving} fullWidth data-testid="update-order-btn">
              Update Order
            </Button>
          </div>

          <div className="card p-6">
            <h3 className="font-heading font-semibold mb-3">Customer</h3>
            <p className="text-sm font-medium">{order.profile?.full_name || addr.full_name}</p>
            <p className="text-sm text-ink-muted">{order.profile?.email}</p>
            <p className="text-sm text-ink-muted mt-3">
              {addr.line1}, {addr.city}, {addr.state} — {addr.pincode}
            </p>
            <p className="text-sm text-ink-muted">{addr.phone}</p>

            <button
              onClick={openWhatsApp}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition"
            >
              <MessageCircle className="w-4 h-4" /> Open WhatsApp Chat (7010586606)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
