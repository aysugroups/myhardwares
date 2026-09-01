import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { adminService } from '@/services/adminService'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { OrderTimeline } from '@/components/account/OrderTimeline'
import { STATUS_COLOR, ORDER_STATUS_LABEL, ORDER_STATUSES } from '@/lib/constants'
import { formatINR, formatDateTime } from '@/lib/utils'

export default function AdminOrderDetail() {
  const { id = '' } = useParams()
  const { data: order, isLoading, refetch } = useQuery({ queryKey: ['admin-order', id], queryFn: () => adminService.orderById(id) })
  const [status, setStatus] = useState('')
  const [tracking, setTracking] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (order) { setStatus(order.status); setTracking(order.tracking_number || '') } }, [order])

  if (isLoading) return <Skeleton className="h-96" />
  if (!order) return <p>Order not found.</p>
  const addr = order.address || {}

  const update = async () => {
    setSaving(true)
    try { await adminService.updateOrderStatus(order.id, status, note, tracking); toast.success('Order updated'); setNote(''); refetch() } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <div>
      <Link to="/admin/orders" className="text-ink-muted hover:text-brand flex items-center gap-1 text-sm mb-4"><ChevronLeft className="w-4 h-4" /> Back to orders</Link>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div><h1 className="font-heading font-bold text-2xl tracking-tight">{order.order_number}</h1><p className="text-ink-muted text-sm">{formatDateTime(order.created_at)}</p></div>
        <span className={`chip ${STATUS_COLOR[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-heading font-semibold mb-4">Items</h3>
            {order.items.map((it: any) => (
              <div key={it.id} className="flex items-center gap-3 py-2"><img src={it.image_url || '/logo-icon.png'} className="w-12 h-12 rounded-xl object-cover bg-warm" alt="" /><div className="flex-1 min-w-0"><p className="text-sm font-medium line-clamp-1">{it.product_name}</p><p className="text-xs text-ink-muted">SKU {it.sku} • {formatINR(it.unit_price)} × {it.quantity}</p></div><span className="font-semibold">{formatINR(it.line_total)}</span></div>
            ))}
            <div className="border-t border-line mt-4 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-ink-muted">Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>− {formatINR(order.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-ink-muted">Shipping</span><span>{formatINR(order.shipping)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span className="font-heading font-bold">{formatINR(order.total)}</span></div>
            </div>
          </div>
          <div className="card p-6"><h3 className="font-heading font-semibold mb-4">Tracking Timeline</h3><OrderTimeline status={order.status} history={order.history} /></div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-heading font-semibold mb-3">Update Status</h3>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field mb-3" data-testid="order-status-select">{ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className="input-field mb-3" data-testid="tracking-input" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="input-field mb-3" />
            <Button onClick={update} loading={saving} fullWidth data-testid="update-order-btn">Update Order</Button>
          </div>
          <div className="card p-6">
            <h3 className="font-heading font-semibold mb-3">Customer</h3>
            <p className="text-sm font-medium">{order.profile?.full_name || addr.full_name}</p>
            <p className="text-sm text-ink-muted">{order.profile?.email}</p>
            <p className="text-sm text-ink-muted mt-3">{addr.line1}, {addr.city}, {addr.state} — {addr.pincode}</p>
            <p className="text-sm text-ink-muted">{addr.phone}</p>
          </div>
          <div className="card p-6 text-sm">
            <h3 className="font-heading font-semibold mb-2">Payment</h3>
            <p className="text-ink-muted">Status: <span className="font-medium text-ink">{order.payment_status}</span></p>
            {order.razorpay_payment_id && <p className="text-ink-muted mt-1 break-all">Payment ID: {order.razorpay_payment_id}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
