import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { IndianRupee, ShoppingCart, TrendingUp, Users } from 'lucide-react'
import { adminService } from '@/services/adminService'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatINR } from '@/lib/utils'

const COLORS = ['#FF5E1A', '#FF8C5A', '#FFB68C', '#1A1A1A', '#52525B', '#E5E7EB']

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => adminService.dashboard() })
  if (isLoading) return <Skeleton className="h-96" />
  const d = data || {}
  const aov = d.total_orders ? Math.round((d.revenue || 0) / d.total_orders) : 0

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6">Analytics</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: IndianRupee, label: 'Revenue', value: formatINR(d.revenue || 0) },
          { icon: ShoppingCart, label: 'Orders', value: d.total_orders || 0 },
          { icon: TrendingUp, label: 'Avg Order Value', value: formatINR(aov) },
          { icon: Users, label: 'Customers', value: d.total_users || 0 },
        ].map((c) => (
          <div key={c.label} className="card p-5"><div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center mb-3"><c.icon className="w-5 h-5 text-brand" /></div><p className="text-2xl font-heading font-bold">{c.value}</p><p className="text-sm text-ink-muted">{c.label}</p></div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-heading font-semibold mb-4">Revenue Trend</h3>
          {(d.revenue_series || []).length === 0 ? <p className="text-ink-muted text-sm py-16 text-center">No data yet.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={d.revenue_series}>
                <defs><linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF5E1A" stopOpacity={0.3} /><stop offset="100%" stopColor="#FF5E1A" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#999" /><YAxis tick={{ fontSize: 11 }} stroke="#999" /><Tooltip formatter={(v: any) => formatINR(v)} /><Area type="monotone" dataKey="amount" stroke="#FF5E1A" strokeWidth={2.5} fill="url(#rev2)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-6">
          <h3 className="font-heading font-semibold mb-4">Top Categories</h3>
          {(d.top_categories || []).length === 0 ? <p className="text-ink-muted text-sm py-16 text-center">No data yet.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={d.top_categories} dataKey="qty" nameKey="name" cx="50%" cy="50%" outerRadius={90}>{(d.top_categories || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
