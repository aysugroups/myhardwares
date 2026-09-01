import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { brandService } from '@/services/brandService'
import { storageService } from '@/services/storageService'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { slugify } from '@/lib/utils'

export default function AdminBrands() {
  const { data: brands = [], refetch } = useQuery({ queryKey: ['admin-brands'], queryFn: () => brandService.list(false) })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', slug: '', logo_url: '', is_active: true, sort_order: 0 })
  const [saving, setSaving] = useState(false)

  const openNew = () => { setEditing(null); setForm({ name: '', slug: '', logo_url: '', is_active: true, sort_order: brands.length }); setOpen(true) }
  const openEdit = (b: any) => { setEditing(b); setForm({ ...b }); setOpen(true) }
  const save = async () => {
    if (!form.name) return toast.error('Name required')
    setSaving(true)
    try { const payload = { ...form, slug: form.slug || slugify(form.name) }; if (editing) await brandService.update(editing.id, payload); else await brandService.create(payload); toast.success('Saved'); setOpen(false); refetch() } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  const del = async (b: any) => { if (!confirm(`Delete ${b.name}?`)) return; try { await brandService.remove(b.id); toast.success('Deleted'); refetch() } catch (e: any) { toast.error(e.message) } }
  const upload = async (f: File | undefined) => { if (!f) return; try { const { url } = await storageService.upload(f, 'brands'); setForm((x: any) => ({ ...x, logo_url: url })) } catch (e: any) { toast.error(e.message) } }

  return (
    <div>
      <div className="flex items-center justify-between mb-6"><h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">Brands</h1><Button onClick={openNew} data-testid="add-brand"><Plus className="w-4 h-4" /> Add Brand</Button></div>
      {brands.length === 0 ? <EmptyState icon={Tag} title="No brands" description="Add brands to associate with products." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {brands.map((b: any) => (
            <div key={b.id} className="card p-5 text-center" data-testid={`brand-${b.slug}`}>
              <div className="h-14 flex items-center justify-center mb-2">{b.logo_url ? <img src={b.logo_url} className="max-h-12 object-contain" alt="" /> : <span className="font-heading font-semibold text-ink-muted">{b.name}</span>}</div>
              <p className="font-semibold text-sm">{b.name}</p>
              <div className="flex justify-center gap-1 mt-3"><Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button><Button size="sm" variant="ghost" onClick={() => del(b)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Brand' : 'New Brand'}>
        <div className="space-y-4">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-field" data-testid="brand-name" />
          <div className="flex items-center gap-3">{form.logo_url && <img src={form.logo_url} className="w-16 h-16 rounded-xl object-contain bg-warm" alt="" />}<label className="btn-secondary cursor-pointer text-sm">Upload Logo<input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} /></label></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f: any) => ({ ...f, is_active: e.target.checked }))} className="accent-brand w-4 h-4" /> Active</label>
          <Button onClick={save} loading={saving} fullWidth data-testid="save-brand">Save</Button>
        </div>
      </Modal>
    </div>
  )
}
