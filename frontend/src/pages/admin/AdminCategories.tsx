import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import { categoryService } from '@/services/categoryService'
import { storageService } from '@/services/storageService'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { slugify } from '@/lib/utils'

export default function AdminCategories() {
  const { data: categories = [], refetch } = useQuery({ queryKey: ['admin-categories'], queryFn: () => categoryService.list(false) })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', slug: '', description: '', image_url: '', is_active: true, sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const openNew = () => { setEditing(null); setForm({ name: '', slug: '', description: '', image_url: '', is_active: true, sort_order: categories.length }); setOpen(true) }
  const openEdit = (c: any) => { setEditing(c); setForm({ ...c }); setOpen(true) }

  const save = async () => {
    if (!form.name) return toast.error('Name is required')
    setSaving(true)
    try {
      const payload = { ...form, slug: form.slug || slugify(form.name) }
      if (editing) await categoryService.update(editing.id, payload)
      else await categoryService.create(payload)
      toast.success('Saved'); setOpen(false); refetch()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  const del = async (c: any) => { if (!confirm(`Delete ${c.name}?`)) return; try { await categoryService.remove(c.id); toast.success('Deleted'); refetch() } catch (e: any) { toast.error(e.message) } }
  const upload = async (f: File | undefined) => { if (!f) return; setUploading(true); try { const { url } = await storageService.upload(f, 'categories'); setForm((x: any) => ({ ...x, image_url: url })) } catch (e: any) { toast.error(e.message) } finally { setUploading(false) } }

  const [subModalOpen, setSubModalOpen] = useState(false)
  const [selectedCat, setSelectedCat] = useState<any>(null)
  const [subList, setSubList] = useState<any[]>([])
  const [subEditing, setSubEditing] = useState<any>(null)
  const [subForm, setSubForm] = useState<any>({ name: '', slug: '', is_active: true, sort_order: 0 })
  const [subSaving, setSubSaving] = useState(false)

  const openSubcategories = async (c: any) => {
    setSelectedCat(c)
    const subs = await categoryService.subcategories(c.id, false)
    setSubList(subs)
    setSubModalOpen(true)
  }

  const openNewSub = () => {
    setSubEditing(null)
    setSubForm({ name: '', slug: '', is_active: true, sort_order: subList.length })
  }

  const openEditSub = (s: any) => {
    setSubEditing(s)
    setSubForm({ ...s })
  }

  const saveSub = async () => {
    if (!subForm.name) return toast.error('Subcategory name is required')
    setSubSaving(true)
    try {
      const payload = {
        ...subForm,
        slug: subForm.slug || slugify(subForm.name),
        category_id: selectedCat.id,
      }
      if (subEditing) {
        await categoryService.updateSubcategory(subEditing.id, payload)
      } else {
        await categoryService.createSubcategory(payload)
      }
      toast.success('Subcategory saved')
      const updated = await categoryService.subcategories(selectedCat.id, false)
      setSubList(updated)
      setSubEditing(null)
      setSubForm({ name: '', slug: '', is_active: true, sort_order: updated.length })
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubSaving(false)
    }
  }

  const delSub = async (s: any) => {
    if (!confirm(`Delete subcategory "${s.name}"?`)) return
    try {
      await categoryService.removeSubcategory(s.id)
      toast.success('Subcategory deleted')
      const updated = await categoryService.subcategories(selectedCat.id, false)
      setSubList(updated)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6"><h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">Categories &amp; Subcategories</h1><Button onClick={openNew} data-testid="add-category"><Plus className="w-4 h-4" /> Add Category</Button></div>
      {categories.length === 0 ? <EmptyState icon={LayoutGrid} title="No categories" description="Create categories to organize your catalog." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c: any) => (
            <div key={c.id} className="card overflow-hidden" data-testid={`cat-${c.slug}`}>
              <div className="h-32 bg-warm">{c.image_url && <img src={c.image_url} className="w-full h-full object-cover" alt="" />}</div>
              <div className="p-4">
                <div className="flex items-center justify-between"><p className="font-semibold">{c.name}</p><span className={`chip ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{c.is_active ? 'Active' : 'Hidden'}</span></div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                  <button onClick={() => openSubcategories(c)} className="text-xs font-semibold text-brand hover:underline flex items-center gap-1" data-testid={`cat-subs-${c.slug}`}>Manage Subcategories</button>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(c)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Category' : 'New Category'}>
        <div className="space-y-4">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))} className="input-field" data-testid="cat-name" />
          <input placeholder="Slug" value={form.slug} onChange={(e) => setForm((f: any) => ({ ...f, slug: e.target.value }))} className="input-field" />
          <textarea placeholder="Description" value={form.description || ''} onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))} className="input-field resize-none" rows={2} />
          <div className="flex items-center gap-3">
            {form.image_url && <img src={form.image_url} className="w-16 h-16 rounded-xl object-cover" alt="" />}
            <label className="btn-secondary cursor-pointer text-sm">{uploading ? 'Uploading...' : 'Upload Image'}<input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} /></label>
          </div>
          <div className="flex items-center gap-4">
            <input type="number" placeholder="Sort order" value={form.sort_order} onChange={(e) => setForm((f: any) => ({ ...f, sort_order: Number(e.target.value) }))} className="input-field w-32" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f: any) => ({ ...f, is_active: e.target.checked }))} className="accent-brand w-4 h-4" /> Active</label>
          </div>
          <Button onClick={save} loading={saving} fullWidth data-testid="save-category">Save</Button>
        </div>
      </Modal>

      {/* Subcategories Modal */}
      <Modal open={subModalOpen} onClose={() => setSubModalOpen(false)} title={`Subcategories — ${selectedCat?.name || ''}`}>
        <div className="space-y-5">
          <div className="border border-line rounded-xl p-4 bg-warm/50 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{subEditing ? 'Edit Subcategory' : 'Add New Subcategory'}</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <input placeholder="Subcategory Name" value={subForm.name} onChange={(e) => setSubForm((f: any) => ({ ...f, name: e.target.value, slug: subEditing ? f.slug : slugify(e.target.value) }))} className="input-field py-2 text-sm" />
              <input placeholder="Slug" value={subForm.slug} onChange={(e) => setSubForm((f: any) => ({ ...f, slug: e.target.value }))} className="input-field py-2 text-sm" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={subForm.is_active} onChange={(e) => setSubForm((f: any) => ({ ...f, is_active: e.target.checked }))} className="accent-brand w-4 h-4" /> Active</label>
              <div className="flex gap-2">
                {subEditing && <Button size="sm" variant="ghost" onClick={openNewSub}>Cancel</Button>}
                <Button size="sm" onClick={saveSub} loading={subSaving}>{subEditing ? 'Update' : 'Add'}</Button>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">Existing Subcategories ({subList.length})</h4>
            {subList.length === 0 ? (
              <p className="text-xs text-ink-muted py-4 text-center">No subcategories yet for {selectedCat?.name}.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {subList.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-line bg-white text-sm">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-ink-muted">/{s.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`chip text-[10px] mr-1 ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{s.is_active ? 'Active' : 'Hidden'}</span>
                      <Button size="sm" variant="ghost" onClick={() => openEditSub(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => delSub(s)} className="text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
