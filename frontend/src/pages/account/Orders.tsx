import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { orderService } from '@/services/orderService'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { STATUS_COLOR, ORDER_STATUS_LABEL } from '@/lib/constants'
import { formatINR, formatDate } from '@/lib/utils'

export default function Orders() {
  const user = useAuthStore((s) => s.user)
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['my-orders', user?.id], queryFn: () => orderService.myOrders(user!.id), enabled: !!user })

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6">My Orders</h1>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div> :
        orders.length === 0 ? <EmptyState icon={ShoppingBag} title="No orders yet" description="When you place an order it will show up here." action={<Link to="/products" className="btn-primary">Shop Now</Link>} /> : (
          <div className="space-y-4">
            {orders.map((o: any) => (
              <Link key={o.id} to={`/account/orders/${o.id}`} className="card p-5 flex items-center gap-4 hover:shadow-card transition-shadow" data-testid={`order-${o.order_number}`}>
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((it: any, i: number) => <img key={i} src={it.image_url || '/logo-icon.png'} className="w-12 h-12 rounded-xl object-cover border-2 border-white bg-warm" alt="" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{o.order_number}</span><span className={`chip ${STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span></div>
                  <p className="text-sm text-ink-muted mt-1">{o.items.length} item{o.items.length > 1 ? 's' : ''} • {formatDate(o.created_at)}</p>
                </div>
                <div className="text-right"><p className="font-heading font-bold">{formatINR(o.total)}</p><ChevronRight className="w-5 h-5 text-ink-muted ml-auto mt-1" /></div>
              </Link>
            ))}
          </div>
        )}
    </div>
  )
}
