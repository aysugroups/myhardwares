import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Boxes, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { productAdminService } from '@/services/productAdminService'
import { inventoryService } from '@/services/inventoryService'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export default function AdminInventory() {
  const { data, refetch } = useQuery({ queryKey: ['inv-products'], queryFn: () => productAdminService.list({ pageSize: 100 }) })
  const [open, setOpen] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [change, setChange] = useState('0')
  const [reason, setReason] = useState('restock')
  const [saving, setSaving] = useState(false)

  const items = data?.items || []
  const openAdjust = (p: any) => { setProduct(p); setChange('0'); setReason('restock'); setOpen(true) }
  const adjust = async () => {
    const c = Number(change)
    if (!c) return toast.error('Enter a non-zero amount')
    setSaving(true)
    try { await inventoryService.adjust(product.id, c, reason); toast.success('Stock updated'); setOpen(false); refetch() } catch (e: any) { toast.error(e.message || 'Failed (would go negative?)') } finally { setSaving(false) }
  }

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6 flex items-center gap-2"><Boxes className="w-7 h-7 text-brand" /> Inventory</h1>
      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line text-left text-ink-muted"><th className="p-4 font-medium">Product</th><th className="p-4 font-medium">SKU</th><th className="p-4 font-medium">Stock</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium text-right">Adjust</th></tr></thead>
          <tbody>
            {items.map((p: any) => {
              const state = p.stock <= 0 ? 'out' : p.stock <= p.low_stock_threshold ? 'low' : 'in'
              return (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-warm" data-testid={`inv-${p.id}`}>
                  <td className="p-4 font-medium max-w-[240px] line-clamp-1">{p.name}</td>
                  <td className="p-4 text-ink-muted">{p.sku}</td>
                  <td className="p-4 font-semibold">{p.stock}</td>
                  <td className="p-4"><span className={`chip ${state === 'out' ? 'bg-red-100 text-red-700' : state === 'low' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{state === 'out' ? 'Out of Stock' : state === 'low' ? 'Low Stock' : 'In Stock'}</span></td>
                  <td className="p-4 text-right"><Button size="sm" variant="secondary" onClick={() => openAdjust(p)} data-testid={`adjust-${p.id}`}>Adjust</Button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={`Adjust Stock — ${product?.name || ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">Current stock: <strong>{product?.stock}</strong></p>
          <div className="flex items-center gap-2">
            <button onClick={() => setChange(String(Number(change) - 1))} className="p-3 rounded-xl border border-line"><Minus className="w-4 h-4" /></button>
            <input type="number" value={change} onChange={(e) => setChange(e.target.value)} className="input-field text-center" data-testid="adjust-amount" />
            <button onClick={() => setChange(String(Number(change) + 1))} className="p-3 rounded-xl border border-line"><Plus className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-ink-muted">Use positive to add, negative to reduce. New stock: {(product?.stock || 0) + Number(change || 0)}</p>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="input-field"><option value="restock">Restock</option><option value="correction">Correction</option><option value="damage">Damage/Loss</option><option value="return">Return</option></select>
          <Button onClick={adjust} loading={saving} fullWidth data-testid="save-adjust">Apply Adjustment</Button>
        </div>
      </Modal>
    </div>
  )
}
