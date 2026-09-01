import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { productAdminService } from '@/services/productAdminService'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR } from '@/lib/utils'
import { STATUS_COLOR } from '@/lib/constants'

const STATUS_CHIP: Record<string, string> = { published: 'bg-green-100 text-green-700', draft: 'bg-amber-100 text-amber-700', archived: 'bg-gray-200 text-gray-600' }

export default function AdminProducts() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const { data, isLoading, refetch } = useQuery({ queryKey: ['admin-products', search, status], queryFn: () => productAdminService.list({ search, status }) })

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try { await productAdminService.remove(id); toast.success('Product deleted'); refetch() } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">Products</h1>
        <Link to="/admin/products/new" className="btn-primary" data-testid="add-product-btn"><Plus className="w-4 h-4" /> Add Product</Link>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or SKU" className="input-field pl-10 py-2.5" data-testid="product-search" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-auto py-2.5"><option value="all">All Status</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div> :
          !data?.items.length ? <EmptyState icon={Package} title="No products" description="Add your first product to get started." action={<Link to="/admin/products/new" className="btn-primary">Add Product</Link>} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-ink-muted"><th className="p-4 font-medium">Product</th><th className="p-4 font-medium">SKU</th><th className="p-4 font-medium">Price</th><th className="p-4 font-medium">Stock</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium text-right">Actions</th></tr></thead>
                <tbody>
                  {data.items.map((p: any) => {
                    const img = p.images?.find((i: any) => i.is_primary)?.url || p.images?.[0]?.url
                    return (
                      <tr key={p.id} className="border-b border-line last:border-0 hover:bg-warm" data-testid={`admin-product-${p.id}`}>
                        <td className="p-4"><div className="flex items-center gap-3"><img src={img || '/logo-icon.png'} className="w-11 h-11 rounded-lg object-cover bg-warm" alt="" /><span className="font-medium line-clamp-1 max-w-[220px]">{p.name}</span></div></td>
                        <td className="p-4 text-ink-muted">{p.sku}</td>
                        <td className="p-4 font-medium">{formatINR(p.sale_price || p.price)}</td>
                        <td className="p-4"><span className={p.stock <= 0 ? 'text-red-500' : p.stock <= p.low_stock_threshold ? 'text-amber-600' : ''}>{p.stock}</span></td>
                        <td className="p-4"><span className={`chip ${STATUS_CHIP[p.status]}`}>{p.status}</span></td>
                        <td className="p-4"><div className="flex justify-end gap-1"><Link to={`/admin/products/${p.id}/edit`} className="p-2 rounded-lg hover:bg-white text-ink-muted hover:text-brand" data-testid={`edit-product-${p.id}`}><Pencil className="w-4 h-4" /></Link><button onClick={() => del(p.id, p.name)} className="p-2 rounded-lg hover:bg-white text-ink-muted hover:text-red-500" data-testid={`delete-product-${p.id}`}><Trash2 className="w-4 h-4" /></button></div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  )
}
