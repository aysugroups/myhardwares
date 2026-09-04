import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, Package, UploadCloud, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { productAdminService } from '@/services/productAdminService'
import { categoryService } from '@/services/categoryService'
import { brandService } from '@/services/brandService'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR, slugify } from '@/lib/utils'
import { STATUS_COLOR } from '@/lib/constants'

const STATUS_CHIP: Record<string, string> = { published: 'bg-green-100 text-green-700', draft: 'bg-amber-100 text-amber-700', archived: 'bg-gray-200 text-gray-600' }

export default function AdminProducts() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [importOpen, setImportOpen] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)

  const { data, isLoading, refetch } = useQuery({ queryKey: ['admin-products', search, status], queryFn: () => productAdminService.list({ search, status }) })
  const { data: categories = [] } = useQuery({ queryKey: ['categories', 'all'], queryFn: () => categoryService.list(false) })
  const { data: brands = [] } = useQuery({ queryKey: ['brands', 'all'], queryFn: () => brandService.list(false) })

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try { await productAdminService.remove(id); toast.success('Product deleted'); refetch() } catch (e: any) { toast.error(e.message) }
  }

  const handleImport = async () => {
    if (!csvText.trim()) return toast.error('Please paste CSV data')
    setImporting(true)
    try {
      const lines = csvText.trim().split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length < 2) throw new Error('CSV must contain a header row and at least one data row')

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))
      const nameIdx = headers.indexOf('name')
      const skuIdx = headers.indexOf('sku')
      const priceIdx = headers.indexOf('price')
      const salePriceIdx = headers.indexOf('sale_price')
      const stockIdx = headers.indexOf('stock')
      const catIdx = headers.indexOf('category')
      const brandIdx = headers.indexOf('brand')
      const descIdx = headers.indexOf('description')
      const shortDescIdx = headers.indexOf('short_description')
      const statusIdx = headers.indexOf('status')

      if (nameIdx === -1 || skuIdx === -1 || priceIdx === -1) {
        throw new Error('CSV headers must include at least: name, sku, price')
      }

      let created = 0
      for (let i = 1; i < lines.length; i++) {
        // Basic CSV split supporting quoted strings
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))
        if (!cols[nameIdx] || !cols[skuIdx]) continue

        const catName = catIdx >= 0 ? cols[catIdx]?.toLowerCase() : ''
        const brandName = brandIdx >= 0 ? cols[brandIdx]?.toLowerCase() : ''

        const matchedCat = categories.find((c: any) => c.slug === catName || c.name.toLowerCase() === catName)
        const matchedBrand = brands.find((b: any) => b.slug === brandName || b.name.toLowerCase() === brandName)

        const payload = {
          name: cols[nameIdx],
          slug: slugify(cols[nameIdx]),
          sku: cols[skuIdx],
          price: Number(cols[priceIdx]) || 0,
          sale_price: salePriceIdx >= 0 && cols[salePriceIdx] ? Number(cols[salePriceIdx]) : null,
          stock: stockIdx >= 0 && cols[stockIdx] ? Number(cols[stockIdx]) : 0,
          category_id: matchedCat?.id || null,
          brand_id: matchedBrand?.id || null,
          short_description: shortDescIdx >= 0 ? cols[shortDescIdx] : null,
          description: descIdx >= 0 ? cols[descIdx] : null,
          status: (statusIdx >= 0 && ['published', 'draft', 'archived'].includes(cols[statusIdx])) ? cols[statusIdx] : 'published',
        }

        await productAdminService.create(payload)
        created++
      }

      toast.success(`Successfully imported ${created} product(s)`)
      setCsvText('')
      setImportOpen(false)
      refetch()
    } catch (e: any) {
      toast.error(e.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">Products</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)} data-testid="import-csv-btn">
            <UploadCloud className="w-4 h-4" /> Import CSV
          </Button>
          <Link to="/admin/products/new" className="btn-primary" data-testid="add-product-btn">
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>
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

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import Products (CSV / Bulk)">
        <div className="space-y-4">
          <p className="text-xs text-ink-muted">
            Paste comma-separated rows. Required headers: <code>name, sku, price</code>. Optional: <code>sale_price, stock, category, brand, short_description, description, status</code>.
          </p>
          <div className="p-3 bg-warm rounded-xl text-xs font-mono text-ink-muted overflow-x-auto">
            name,sku,price,sale_price,stock,category,brand,short_description<br />
            Mortise Handle Lock,MH-ML-101,2499,1999,50,door-locks,godrej,Solid brass mortise handle
          </div>
          <textarea
            rows={8}
            placeholder={`name,sku,price,sale_price,stock,category,brand,short_description\nSmart Lock Pro,MH-SL-900,9999,8499,20,door-locks,yale,Smart biometric digital lock`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="input-field font-mono text-xs resize-none"
            data-testid="import-csv-textarea"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCsvText('name,sku,price,sale_price,stock,category,brand,short_description\nPremium Door Closer,MH-DC-01,1899,1499,35,architectural-hardware,dorset,Hydraulic door closer\nStainless Steel Hinges 4-inch,MH-HG-02,599,449,100,furniture-fittings,hettich,SS304 butt hinges pack of 4')}
              className="text-xs text-brand hover:underline font-medium"
            >
              Fill Sample Data
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button onClick={handleImport} loading={importing} data-testid="run-import-btn">Run Import</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
