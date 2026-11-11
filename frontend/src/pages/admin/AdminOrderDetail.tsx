import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, PackageCheck, Truck, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { adminService } from '@/services/adminService'
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
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [breadth, setBreadth] = useState('')
  const [height, setHeight] = useState('')
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    if (order) {
      setStatus(order.status)
      setTracking(order.tracking_number || '')
    }
  }, [order])

  if (isLoading) return <Skeleton className="h-96" />
  if (!order) return <p>Order not found.</p>
  const addr = order.address || {}

  const bookShipway = async () => {
    const values = [weight, length, breadth, height].map(Number)
    if (values.some((v) => !Number.isFinite(v) || v <= 0)) { toast.error('Enter valid parcel weight and all three dimensions.'); return }
    setBooking(true)
    try {
      const result = await adminService.createShipwayShipment({ order_id: order.id, weight_grams: values[0], length_cm: values[1], breadth_cm: values[2], height_cm: values[3] })
      toast.success(result.awb_number ? `Shipment booked. AWB: ${result.awb_number}` : 'Shipment booking accepted by Shipway.')
      await refetch()
    } catch (e: any) { toast.error(e.message || 'Shipway booking failed'); await refetch() }
    finally { setBooking(false) }
  }

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
            className={`chip ${
              order.payment_status === 'paid'
                ? 'bg-green-100 text-green-700'
                : order.payment_status === 'failed'
                ? 'bg-red-100 text-red-700'
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
          <div className="card p-6" data-testid="shipway-shipment-card">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-heading font-semibold">Shipway Shipment</h3>
              <span className={\`chip \${order.shipway_status === 'booked' ? 'bg-green-100 text-green-700' : order.shipway_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}\`}>{(order.shipway_status || 'not booked').replaceAll('_', ' ').toUpperCase()}</span>
            </div>
            {(order.shipway_awb || order.tracking_number) && <div className="rounded-xl bg-warm p-3 mb-3"><p className="text-xs text-ink-muted mb-1">AWB / Tracking number</p><p className="font-mono font-semibold break-all">{order.shipway_awb || order.tracking_number}</p>{order.shipway_booked_at && <p className="text-xs text-ink-muted mt-1">Booked {formatDateTime(order.shipway_booked_at)}</p>}</div>}
            {order.shipway_error && <p className="text-sm text-red-600 flex gap-2 mb-3"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{order.shipway_error}</p>}
            {order.shipway_shipment_created ? <p className="text-sm text-green-700 flex gap-2"><PackageCheck className="w-4 h-4" /> Shipment has been created in Shipway.</p> : <>
              <p className="text-xs text-ink-muted mb-3">Enter packed parcel measurements. Weight in grams; dimensions in centimetres.</p>
              <label className="block text-xs font-medium mb-1">Parcel weight (grams)</label>
              <input type="number" min="1" step="1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 750" className="input-field mb-3" />
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div><label className="block text-xs font-medium mb-1">Length (cm)</label><input type="number" min="1" step="1" value={length} onChange={(e) => setLength(e.target.value)} placeholder="L" className="input-field" /></div>
                <div><label className="block text-xs font-medium mb-1">Breadth (cm)</label><input type="number" min="1" step="1" value={breadth} onChange={(e) => setBreadth(e.target.value)} placeholder="B" className="input-field" /></div>
                <div><label className="block text-xs font-medium mb-1">Height (cm)</label><input type="number" min="1" step="1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="H" className="input-field" /></div>
              </div>
              <Button onClick={bookShipway} loading={booking} fullWidth disabled={order.shipway_status === 'booking' || (order.payment_status !== 'paid' && String(order.payment_method).toLowerCase() !== 'cod')}><Truck className="w-4 h-4" /> Book Shipment with Shipway</Button>
              {order.payment_status !== 'paid' && String(order.payment_method).toLowerCase() !== 'cod' && <p className="text-xs text-amber-700 mt-2">Prepaid orders must have verified payment before booking.</p>}
            </>}
            <p className="text-[11px] text-ink-muted mt-3">Booking creates a real shipment in Shipway. Confirm parcel measurements before proceeding.</p>
          </div>
          <div className="card p-6">
            <h3 className="font-heading font-semibold mb-3">Update Status</h3>
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
          </div>

          <div className="card p-6 text-sm space-y-1.5" data-testid="admin-payment-card">
            <h3 className="font-heading font-semibold mb-2">Payment</h3>
            <p className="text-ink-muted">
              Status:{' '}
              <span className={`font-semibold ${order.payment_status === 'paid' ? 'text-green-600' : order.payment_status === 'failed' ? 'text-red-600' : 'text-amber-600'}`}>
                {order.payment_status.toUpperCase()}
              </span>
            </p>
            <p className="text-ink-muted">
              Gateway: <span className="font-medium text-ink">Razorpay</span>
            </p>
            {order.razorpay_order_id && (
              <p className="text-ink-muted break-all">
                Razorpay Order ID: <span className="font-mono text-xs text-ink">{order.razorpay_order_id}</span>
              </p>
            )}
            {order.razorpay_payment_id && (
              <p className="text-ink-muted break-all">
                Payment ID: <span className="font-mono text-xs text-ink">{order.razorpay_payment_id}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
