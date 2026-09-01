import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Ticket, Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { couponService } from '@/services/couponService'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR, formatDate } from '@/lib/utils'

const EMPTY = { code: '', discount_type: 'percent', discount_value: '', min_order: '', max_discount: '', usage_limit: '', per_user_limit: '', expires_at: '', is_active: true }

export default function AdminCoupons() {
  const { data: coupons = [], refetch } = useQuery({ queryKey: ['admin-coupons'], queryFn: () => couponService.list() })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = (c: any) => { setEditing(c); setForm({ ...EMPTY, ...c, expires_at: c.expires_at?.slice(0, 10) || '' }); setOpen(true) }
  const save = async () => {
    if (!form.code || !form.discount_value) return toast.error('Code and value are required')
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(), discount_type: form.discount_type, discount_value: Number(form.discount_value),
        min_order: form.min_order ? Number(form.min_order) : 0, max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null, per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : null,
        expires_at: form.expires_at || null, is_active: form.is_active,
      }
      if (editing) await couponService.update(editing.id, payload); else await couponService.create(payload)
      toast.success('Saved'); setOpen(false); refetch()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  const del = async (c: any) => { if (!confirm(`Delete ${c.code}?`)) return; await couponService.remove(c.id); toast.success('Deleted'); refetch() }

  return (
    <div>
      <div className="flex items-center justify-between mb-6"><h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">Coupons</h1><Button onClick={openNew} data-testid="add-coupon"><Plus className="w-4 h-4" /> Add Coupon</Button></div>
      {coupons.length === 0 ? <EmptyState icon={Ticket} title="No coupons" description="Create discount coupons for your customers." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c: any) => (
            <div key={c.id} className="card p-5" data-testid={`coupon-${c.code}`}>
              <div className="flex items-center justify-between"><span className="font-heading font-bold text-lg text-brand">{c.code}</span><span className={`chip ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></div>
              <p className="text-sm text-ink-muted mt-2">{c.discount_type === 'percent' ? `${c.discount_value}% off` : `${formatINR(c.discount_value)} off`}{c.min_order ? ` • Min ${formatINR(c.min_order)}` : ''}</p>
              {c.expires_at && <p className="text-xs text-ink-muted mt-1">Expires {formatDate(c.expires_at)}</p>}
              <div className="flex gap-1 mt-3"><Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /> Edit</Button><Button size="sm" variant="ghost" onClick={() => del(c)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Coupon' : 'New Coupon'}>
        <div className="space-y-3">
          <input placeholder="CODE" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} className="input-field uppercase" data-testid="coupon-code" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.discount_type} onChange={(e) => set('discount_type', e.target.value)} className="input-field"><option value="percent">Percentage</option><option value="fixed">Fixed Amount</option></select>
            <input type="number" placeholder="Value" value={form.discount_value} onChange={(e) => set('discount_value', e.target.value)} className="input-field" data-testid="coupon-value" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Min order (₹)" value={form.min_order} onChange={(e) => set('min_order', e.target.value)} className="input-field" />
            <input type="number" placeholder="Max discount (₹)" value={form.max_discount} onChange={(e) => set('max_discount', e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Usage limit" value={form.usage_limit} onChange={(e) => set('usage_limit', e.target.value)} className="input-field" />
            <input type="number" placeholder="Per user limit" value={form.per_user_limit} onChange={(e) => set('per_user_limit', e.target.value)} className="input-field" />
          </div>
          <input type="date" value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} className="input-field" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="accent-brand w-4 h-4" /> Active</label>
          <Button onClick={save} loading={saving} fullWidth data-testid="save-coupon">Save Coupon</Button>
        </div>
      </Modal>
    </div>
  )
}
