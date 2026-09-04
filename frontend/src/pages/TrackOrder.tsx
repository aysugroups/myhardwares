import { useState } from 'react'
import { Package, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Seo } from '@/components/common/Seo'
import { Button } from '@/components/ui/Button'
import { OrderTimeline } from '@/components/account/OrderTimeline'
import { UpiPaymentSection } from '@/components/account/UpiPaymentSection'
import { orderService } from '@/services/orderService'
import { STATUS_COLOR, ORDER_STATUS_LABEL } from '@/lib/constants'
import { formatINR, formatDate } from '@/lib/utils'

export default function TrackOrder() {
  const [num, setNum] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [searched, setSearched] = useState(false)

  const track = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!num.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const o = await orderService.getByNumber(num.trim().toUpperCase())
      setOrder(o)
    } catch {
      toast.error('Could not fetch order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-x py-8 md:py-12 max-w-3xl">
      <Seo title="Track Order" />
      <h1 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mb-2">Track Your Order</h1>
      <p className="text-ink-muted mb-6">Enter your order number (e.g. MH-XXXXXX) to see live status.</p>
      <form onSubmit={track} className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-muted"
            style={{ width: 18, height: 18 }}
          />
          <input
            value={num}
            onChange={(e) => setNum(e.target.value)}
            placeholder="Order number"
            className="input-field pl-11 uppercase"
            data-testid="track-input"
          />
        </div>
        <Button type="submit" loading={loading} data-testid="track-submit">Track</Button>
      </form>

      {searched && !loading && !order && (
        <div className="card p-8 text-center">
          <Package className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <p className="font-semibold">Order not found</p>
          <p className="text-ink-muted text-sm mt-1">Please check the order number and try again.</p>
        </div>
      )}

      {order && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-6 border-b border-line">
              <div>
                <p className="font-heading font-bold text-xl">{order.order_number}</p>
                <p className="text-sm text-ink-muted">Placed {formatDate(order.created_at)} • {formatINR(order.total)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`chip ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  Payment: {order.payment_status.toUpperCase()}
                </span>
                <span className={`chip ${STATUS_COLOR[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
              </div>
            </div>
            <OrderTimeline status={order.status} history={order.history} />
            {order.tracking_number && (
              <p className="text-sm mt-4 pt-4 border-t border-line">
                Tracking Number: <strong>{order.tracking_number}</strong>
              </p>
            )}
          </div>

          {order.payment_status !== 'paid' && (
            <UpiPaymentSection order={order} onConfirmed={async () => {
              const updated = await orderService.getByNumber(order.order_number)
              if (updated) setOrder(updated)
            }} />
          )}
        </div>
      )}
    </div>
  )
}
