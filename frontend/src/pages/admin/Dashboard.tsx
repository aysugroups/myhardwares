import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { IndianRupee, ShoppingCart, Users, Package, TrendingUp, AlertTriangle, Clock, RotateCcw } from 'lucide-react'
import { Seo } from '@/components/common/Seo'
import { adminService } from '@/services/adminService'
import { notificationService } from '@/services/notificationService'
import { Skeleton } from '@/components/ui/Skeleton'
import { STATUS_COLOR, ORDER_STATUS_LABEL } from '@/lib/constants'
import { formatINR, formatDate } from '@/lib/utils'

const CARDS = [
  { key: 'revenue', label: 'Total Revenue', icon: IndianRupee, money: true, color: 'text-green-600 bg-green-50' },
  { key: 'today_revenue', label: "Today's Revenue", icon: TrendingUp, money: true, color: 'text-brand bg-brand-light' },
  { key: 'total_orders', label: 'Total Orders', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
  { key: 'total_users', label: 'Total Customers', icon: Users, color: 'text-violet-600 bg-violet-50' },
  { key: 'total_products', label: 'Products', icon: Package, color: 'text-indigo-600 bg-indigo-50' },
  { key: 'pending_orders', label: 'Pending Orders', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  { key: 'low_stock', label: 'Low Stock', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
  { key: 'refunds', label: 'Refunds', icon: RotateCcw, color: 'text-red-600 bg-red-50' },
]

export default function Dashboard() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => adminService.dashboard() })

  useEffect(() => {
    const unsub = notificationService.subscribeOrders(() => refetch())
    return unsub
  }, [])

  if (isLoading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>

  const d = data || {}
  const revSeries = d.revenue_series || []
  const orderSeries = d.orders_series || []

  return (
    <div>
      <Seo title="Admin Dashboard" />
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {CARDS.map((c) => (
          <div key={c.key} className="card p-5" data-testid={`stat-${c.key}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}><c.icon className="w-5 h-5" /></div>
            <p className="text-2xl font-heading font-bold">{c.money ? formatINR(d[c.key] || 0) : (d[c.key] ?? 0)}</p>
            <p className="text-sm text-ink-muted">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h3 className="font-heading font-semibold mb-4">Revenue (last 14 days)</h3>
          {revSeries.length === 0 ? <p className="text-ink-muted text-sm py-12 text-center">No revenue data yet.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revSeries}>
                <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF5E1A" stopOpacity={0.3} /><stop offset="100%" stopColor="#FF5E1A" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#999" />
                <YAxis tick={{ fontSize: 11 }} stroke="#999" />
                <Tooltip formatter={(v: any) => formatINR(v)} />
                <Area type="monotone" dataKey="amount" stroke="#FF5E1A" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-6">
          <h3 className="font-heading font-semibold mb-4">Orders (last 14 days)</h3>
          {orderSeries.length === 0 ? <p className="text-ink-muted text-sm py-12 text-center">No order data yet.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={orderSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#999" />
                <YAxis tick={{ fontSize: 11 }} stroke="#999" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#FF5E1A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4"><h3 className="font-heading font-semibold">Recent Orders</h3><Link to="/admin/orders" className="text-brand text-sm font-semibold">View all</Link></div>
          {(d.recent_orders || []).length === 0 ? <p className="text-ink-muted text-sm">No orders yet.</p> : (
            <div className="space-y-2">
              {(d.recent_orders || []).map((o: any) => (
                <Link key={o.id} to={`/admin/orders/${o.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-warm">
                  <div><p className="font-semibold text-sm">{o.order_number}</p><p className="text-xs text-ink-muted">{formatDate(o.created_at)}</p></div>
                  <div className="text-right"><span className={`chip ${STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span><p className="font-semibold text-sm mt-1">{formatINR(o.total)}</p></div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="card p-6">
          <h3 className="font-heading font-semibold mb-4">Top Products</h3>
          {(d.top_products || []).length === 0 ? <p className="text-ink-muted text-sm">No sales data yet.</p> : (
            <div className="space-y-2">
              {(d.top_products || []).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-warm">
                  <span className="text-sm font-medium line-clamp-1">{p.name}</span>
                  <span className="text-sm text-ink-muted">{p.qty} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
