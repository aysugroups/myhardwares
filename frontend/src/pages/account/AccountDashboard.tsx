import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, Heart, MapPin, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { orderService } from '@/services/orderService'
import { STATUS_COLOR, ORDER_STATUS_LABEL } from '@/lib/constants'
import { formatINR, formatDate } from '@/lib/utils'

export default function AccountDashboard() {
  const user = useAuthStore((s) => s.user)
  const { data: orders = [] } = useQuery({ queryKey: ['my-orders', user?.id], queryFn: () => orderService.myOrders(user!.id), enabled: !!user })
  const totalSpent = orders.filter((o: any) => o.payment_status === 'paid').reduce((s: number, o: any) => s + Number(o.total), 0)

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-2">Hello, {user?.full_name?.split(' ')[0]} 👋</h1>
      <p className="text-ink-muted mb-8">Here's a quick look at your account.</p>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5"><ShoppingBag className="w-6 h-6 text-brand mb-2" /><p className="text-2xl font-heading font-bold">{orders.length}</p><p className="text-sm text-ink-muted">Total Orders</p></div>
        <div className="card p-5"><MapPin className="w-6 h-6 text-brand mb-2" /><p className="text-2xl font-heading font-bold">{formatINR(totalSpent)}</p><p className="text-sm text-ink-muted">Total Spent</p></div>
        <Link to="/account/wishlist" className="card p-5 hover:shadow-card transition-shadow"><Heart className="w-6 h-6 text-brand mb-2" /><p className="text-lg font-heading font-bold">View Wishlist</p><p className="text-sm text-ink-muted flex items-center gap-1">Saved items <ArrowRight className="w-3 h-3" /></p></Link>
      </div>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="font-heading font-semibold text-lg">Recent Orders</h2><Link to="/account/orders" className="text-brand text-sm font-semibold">View all</Link></div>
        {orders.length === 0 ? <p className="text-ink-muted text-sm">No orders yet. <Link to="/products" className="text-brand">Start shopping</Link></p> : (
          <div className="space-y-3">
            {orders.slice(0, 4).map((o: any) => (
              <Link key={o.id} to={`/account/orders/${o.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-warm transition-colors">
                <div><p className="font-semibold text-sm">{o.order_number}</p><p className="text-xs text-ink-muted">{formatDate(o.created_at)}</p></div>
                <div className="text-right"><span className={`chip ${STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span><p className="font-semibold text-sm mt-1">{formatINR(o.total)}</p></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
