import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { adminService } from '@/services/adminService'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatINR, formatDate } from '@/lib/utils'

export default function AdminCustomers() {
  const { data: customers = [], isLoading } = useQuery({ queryKey: ['admin-customers'], queryFn: () => adminService.customers() })
  return (
    <div>
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6">Customers</h1>
      <div className="card overflow-hidden">
        {isLoading ? <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div> :
          customers.length === 0 ? <EmptyState icon={Users} title="No customers yet" description="Registered customers will appear here." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-ink-muted"><th className="p-4 font-medium">Customer</th><th className="p-4 font-medium">Email</th><th className="p-4 font-medium">Phone</th><th className="p-4 font-medium">Orders</th><th className="p-4 font-medium">Spent</th><th className="p-4 font-medium">Joined</th></tr></thead>
                <tbody>
                  {customers.map((c: any) => (
                    <tr key={c.id} className="border-b border-line last:border-0 hover:bg-warm" data-testid={`customer-${c.id}`}>
                      <td className="p-4 font-medium">{c.full_name || '—'}</td>
                      <td className="p-4 text-ink-muted">{c.email}</td>
                      <td className="p-4 text-ink-muted">{c.phone || '—'}</td>
                      <td className="p-4">{c.order_count || 0}</td>
                      <td className="p-4 font-medium">{formatINR(c.total_spent || 0)}</td>
                      <td className="p-4 text-ink-muted">{c.created_at ? formatDate(c.created_at) : '—'}</td>
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
