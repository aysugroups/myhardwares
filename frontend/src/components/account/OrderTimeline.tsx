import { TRACKING_STEPS, ORDER_STATUS_LABEL } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import { Check, Package, Truck, Home, Clock, MapPin } from 'lucide-react'

const ICONS: Record<string, any> = { confirmed: Check, processing: Clock, packed: Package, shipped: Truck, out_for_delivery: MapPin, delivered: Home }

export function OrderTimeline({ status, history = [] }: { status: string; history?: any[] }) {
  const cancelled = ['cancelled', 'payment_failed', 'refunded', 'refund_initiated'].includes(status)
  if (cancelled) {
    return (
      <div className="rounded-2xl bg-warm p-5">
        <p className="font-semibold text-ink">Status: {ORDER_STATUS_LABEL[status]}</p>
        {history.length > 0 && <p className="text-sm text-ink-muted mt-1">Updated {formatDateTime(history[history.length - 1].created_at)}</p>}
      </div>
    )
  }
  const currentIdx = TRACKING_STEPS.indexOf(status as any)
  const reachedAt = (s: string) => history.find((h) => h.status === s)?.created_at

  return (
    <div className="relative" data-testid="order-timeline">
      {TRACKING_STEPS.map((s, i) => {
        const done = i <= currentIdx
        const active = i === currentIdx
        const Icon = ICONS[s] || Check
        return (
          <div key={s} className="flex gap-4 pb-6 last:pb-0 relative">
            {i < TRACKING_STEPS.length - 1 && <span className={`absolute left-[19px] top-10 bottom-0 w-0.5 ${done ? 'bg-brand' : 'bg-line'}`} />}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${done ? 'bg-brand text-white' : 'bg-white border-2 border-line text-ink-muted'} ${active ? 'ring-4 ring-brand/20' : ''}`}>
              <Icon className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="pt-1.5">
              <p className={`font-semibold ${done ? 'text-ink' : 'text-ink-muted'}`}>{ORDER_STATUS_LABEL[s]}</p>
              {reachedAt(s) && <p className="text-sm text-ink-muted">{formatDateTime(reachedAt(s))}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
