import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ShoppingCart, ChevronRight } from 'lucide-react'
import { adminService } from '@/services/adminService'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { STATUS_COLOR, ORDER_STATUS_LABEL, ORDER_STATUSES } from '@/lib/constants'
import { formatINR, formatDate } from '@/lib/utils'

export default function AdminOrders() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const { data, isLoading } = useQuery({ queryKey: ['admin-orders', search, status], queryFn: () => adminService.orders({ search, status }) })

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6">Orders</h1>
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order number" className="input-field pl-10 py-2.5" data-testid="order-search" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-auto py-2.5"><option value="all">All Status</option>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select>
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div> :
          !data?.items.length ? <EmptyState icon={ShoppingCart} title="No orders" description="Orders will appear here once customers start buying." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-ink-muted"><th className="p-4 font-medium">Order</th><th className="p-4 font-medium">Customer</th><th className="p-4 font-medium">Amount</th><th className="p-4 font-medium">Payment</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium">Date</th><th className="p-4"></th></tr></thead>
                <tbody>
                  {data.items.map((o: any) => (
                    <tr key={o.id} className="border-b border-line last:border-0 hover:bg-warm" data-testid={`admin-order-${o.order_number}`}>
                      <td className="p-4 font-semibold">{o.order_number}</td>
                      <td className="p-4"><p className="line-clamp-1">{o.profile?.full_name || o.address?.full_name || '—'}</p><p className="text-xs text-ink-muted line-clamp-1">{o.profile?.email}</p></td>
                      <td className="p-4 font-medium">{formatINR(o.total)}</td>
                      <td className="p-4"><span className={`chip ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : o.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{o.payment_status}</span></td>
                      <td className="p-4"><span className={`chip ${STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                      <td className="p-4 text-ink-muted">{formatDate(o.created_at)}</td>
                      <td className="p-4"><Link to={`/admin/orders/${o.id}`} className="p-2 rounded-lg hover:bg-white text-ink-muted hover:text-brand inline-block" data-testid={`view-order-${o.order_number}`}><ChevronRight className="w-4 h-4" /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  )
}
