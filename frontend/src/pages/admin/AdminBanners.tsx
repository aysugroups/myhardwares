import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Image as ImageIcon, Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { bannerService } from '@/services/bannerService'
import { storageService } from '@/services/storageService'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'

const EMPTY = { title: '', subtitle: '', image_url: '', link: '', position: 'home_hero', is_active: true, sort_order: 0 }

export default function AdminBanners() {
  const { data: banners = [], refetch } = useQuery({ queryKey: ['admin-banners'], queryFn: () => bannerService.list(false) })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, sort_order: banners.length }); setOpen(true) }
  const openEdit = (b: any) => { setEditing(b); setForm({ ...b }); setOpen(true) }
  const upload = async (f: File | undefined) => { if (!f) return; try { const { url } = await storageService.upload(f, 'banners'); set('image_url', url) } catch (e: any) { toast.error(e.message) } }
  const save = async () => {
    setSaving(true)
    try { if (editing) await bannerService.update(editing.id, form); else await bannerService.create(form); toast.success('Saved'); setOpen(false); refetch() } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  const del = async (b: any) => { if (!confirm('Delete banner?')) return; await bannerService.remove(b.id); toast.success('Deleted'); refetch() }

  return (
    <div>
      <div className="flex items-center justify-between mb-6"><h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">Banners</h1><Button onClick={openNew} data-testid="add-banner"><Plus className="w-4 h-4" /> Add Banner</Button></div>
      {banners.length === 0 ? <EmptyState icon={ImageIcon} title="No banners" description="Add promotional banners for your homepage." /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {banners.map((b: any) => (
            <div key={b.id} className="card overflow-hidden" data-testid={`banner-${b.id}`}>
              <div className="h-40 bg-warm">{b.image_url && <img src={b.image_url} className="w-full h-full object-cover" alt="" />}</div>
              <div className="p-4"><div className="flex items-center justify-between"><p className="font-semibold">{b.title}</p><span className={`chip ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{b.position}</span></div><div className="flex gap-1 mt-2"><Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /> Edit</Button><Button size="sm" variant="ghost" onClick={() => del(b)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Banner' : 'New Banner'}>
        <div className="space-y-3">
          <input placeholder="Title" value={form.title} onChange={(e) => set('title', e.target.value)} className="input-field" data-testid="banner-title" />
          <input placeholder="Subtitle" value={form.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} className="input-field" />
          <input placeholder="Link (e.g. /deals)" value={form.link || ''} onChange={(e) => set('link', e.target.value)} className="input-field" />
          <select value={form.position} onChange={(e) => set('position', e.target.value)} className="input-field"><option value="home_hero">Home Hero</option><option value="home_promo">Home Promo</option></select>
          <div className="flex items-center gap-3">{form.image_url && <img src={form.image_url} className="w-20 h-14 rounded-lg object-cover" alt="" />}<label className="btn-secondary cursor-pointer text-sm">Upload Image<input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} /></label></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="accent-brand w-4 h-4" /> Active</label>
          <Button onClick={save} loading={saving} fullWidth data-testid="save-banner">Save Banner</Button>
        </div>
      </Modal>
    </div>
  )
}
