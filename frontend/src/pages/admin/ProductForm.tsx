import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Upload, Star, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { productAdminService } from '@/services/productAdminService'
import { categoryService } from '@/services/categoryService'
import { brandService } from '@/services/brandService'
import { storageService } from '@/services/storageService'
import { Button } from '@/components/ui/Button'
import { slugify } from '@/lib/utils'

const EMPTY = {
  name: '', slug: '', sku: '', short_description: '', description: '', category_id: '', subcategory_id: '', brand_id: '',
  price: '', sale_price: '', stock: '0', low_stock_threshold: '5', status: 'published',
  is_featured: false, is_best_seller: false, is_new_arrival: false, weight: '', dimensions: '', warranty: '',
  tags: '', seo_title: '', seo_description: '',
}

export default function ProductForm() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const [form, setForm] = useState<any>(EMPTY)
  const [specsList, setSpecsList] = useState<{ key: string; value: string }[]>([])
  const [images, setImages] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [productId, setProductId] = useState<string | null>(id || null)

  const { data: categories = [] } = useQuery({ queryKey: ['categories', 'all'], queryFn: () => categoryService.list(false) })
  const { data: brands = [] } = useQuery({ queryKey: ['brands', 'all'], queryFn: () => brandService.list(false) })
  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', form.category_id],
    queryFn: () => categoryService.subcategories(form.category_id),
    enabled: !!form.category_id,
  })
  const { data: existing } = useQuery({ queryKey: ['admin-product', id], queryFn: () => productAdminService.getById(id!), enabled: editing })

  useEffect(() => {
    if (existing) {
      setForm({
        ...EMPTY, ...existing,
        subcategory_id: existing.subcategory_id || '',
        price: String(existing.price ?? ''), sale_price: existing.sale_price != null ? String(existing.sale_price) : '',
        stock: String(existing.stock ?? 0), low_stock_threshold: String(existing.low_stock_threshold ?? 5),
        tags: (existing.tags || []).join(', '),
      })
      setImages(existing.images || [])
      if (existing.specifications && typeof existing.specifications === 'object') {
        const pairs = Object.entries(existing.specifications).map(([key, value]) => ({ key, value: String(value) }))
        setSpecsList(pairs)
      }
    }
  }, [existing])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v, ...(k === 'name' && !editing ? { slug: slugify(v) } : {}) }))

  const buildPayload = () => {
    const specsObj: Record<string, string> = {}
    specsList.forEach((s) => {
      if (s.key.trim() && s.value.trim()) specsObj[s.key.trim()] = s.value.trim()
    })

    return {
      name: form.name, slug: form.slug || slugify(form.name), sku: form.sku, short_description: form.short_description,
      description: form.description, category_id: form.category_id || null, subcategory_id: form.subcategory_id || null,
      brand_id: form.brand_id || null,
      price: Number(form.price), sale_price: form.sale_price ? Number(form.sale_price) : null,
      stock: Number(form.stock), low_stock_threshold: Number(form.low_stock_threshold), status: form.status,
      is_featured: form.is_featured, is_best_seller: form.is_best_seller, is_new_arrival: form.is_new_arrival,
      weight: form.weight || null, dimensions: form.dimensions || null, warranty: form.warranty || null,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      specifications: specsObj,
      seo_title: form.seo_title || null, seo_description: form.seo_description || null,
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.sku || !form.price) return toast.error('Name, SKU and price are required')
    setSaving(true)
    try {
      if (editing) { await productAdminService.update(id!, buildPayload()); toast.success('Product updated') }
      else { const p = await productAdminService.create(buildPayload()); setProductId(p.id); toast.success('Product created. You can now add images.') ; navigate(`/admin/products/${p.id}/edit`) }
    } catch (e: any) { toast.error(e.message || 'Save failed') } finally { setSaving(false) }
  }

  const onUpload = async (files: FileList | null) => {
    if (!files || !productId) { if (!productId) toast.error('Save the product first, then add images'); return }
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const { url, path } = await storageService.upload(file)
        const isPrimary = images.length === 0
        const img = await productAdminService.addImage(productId, url, path, isPrimary, images.length)
        setImages((prev) => [...prev, img])
      }
      toast.success('Image(s) uploaded')
    } catch (e: any) { toast.error(e.message) } finally { setUploading(false) }
  }
  const delImage = async (img: any) => { await productAdminService.removeImage(img.id); if (img.storage_path) storageService.remove(img.storage_path); setImages((p) => p.filter((i) => i.id !== img.id)) }
  const setPrimary = async (img: any) => { await productAdminService.setPrimaryImage(productId!, img.id); setImages((p) => p.map((i) => ({ ...i, is_primary: i.id === img.id }))) }

  return (
    <div>
      <Link to="/admin/products" className="text-ink-muted hover:text-brand flex items-center gap-1 text-sm mb-4"><ChevronLeft className="w-4 h-4" /> Back to products</Link>
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6">{editing ? 'Edit Product' : 'Add Product'}</h1>

      <form onSubmit={save} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-4">
            <Field label="Product Name *"><input value={form.name} onChange={(e) => set('name', e.target.value)} className="input-field" data-testid="pf-name" /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Slug"><input value={form.slug} onChange={(e) => set('slug', e.target.value)} className="input-field" /></Field>
              <Field label="SKU *"><input value={form.sku} onChange={(e) => set('sku', e.target.value)} className="input-field" data-testid="pf-sku" /></Field>
            </div>
            <Field label="Short Description"><input value={form.short_description} onChange={(e) => set('short_description', e.target.value)} className="input-field" /></Field>
            <Field label="Full Description"><textarea rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} className="input-field resize-none" /></Field>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="font-heading font-semibold">Images</h3>
            <div className="flex flex-wrap gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative w-24 h-24 rounded-xl overflow-hidden border border-line group">
                  <img src={img.url} className="w-full h-full object-cover" alt="" />
                  {img.is_primary && <span className="absolute top-1 left-1 chip bg-brand text-white text-[9px] px-1.5">Primary</span>}
                  <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {!img.is_primary && <button type="button" onClick={() => setPrimary(img)} className="p-1.5 bg-white rounded-lg text-brand"><Star className="w-3.5 h-3.5" /></button>}
                    <button type="button" onClick={() => delImage(img)} className="p-1.5 bg-white rounded-lg text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-line flex flex-col items-center justify-center cursor-pointer hover:border-brand text-ink-muted hover:text-brand" data-testid="upload-image">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /><span className="text-[10px] mt-1">Upload</span></>}
                <input type="file" accept="image/*" multiple hidden onChange={(e) => onUpload(e.target.files)} />
              </label>
            </div>
            {!productId && <p className="text-xs text-amber-600">Save the product first to enable image uploads.</p>}
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold">Specifications</h3>
              <button type="button" onClick={() => setSpecsList((prev) => [...prev, { key: '', value: '' }])} className="text-brand text-xs font-semibold flex items-center gap-1 hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add Spec
              </button>
            </div>
            {specsList.length === 0 ? (
              <p className="text-xs text-ink-muted">No specifications added yet (e.g. Material, Finish, Lock Type, Dimensions).</p>
            ) : (
              <div className="space-y-2">
                {specsList.map((spec, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      placeholder="Name (e.g. Material)"
                      value={spec.key}
                      onChange={(e) => {
                        const val = e.target.value
                        setSpecsList((prev) => prev.map((item, i) => i === idx ? { ...item, key: val } : item))
                      }}
                      className="input-field py-2 text-sm flex-1"
                    />
                    <input
                      placeholder="Value (e.g. Brass)"
                      value={spec.value}
                      onChange={(e) => {
                        const val = e.target.value
                        setSpecsList((prev) => prev.map((item, i) => i === idx ? { ...item, value: val } : item))
                      }}
                      className="input-field py-2 text-sm flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setSpecsList((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-ink-muted hover:text-red-500 rounded-lg hover:bg-warm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="font-heading font-semibold">SEO</h3>
            <Field label="SEO Title"><input value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} className="input-field" /></Field>
            <Field label="SEO Description"><textarea rows={2} value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} className="input-field resize-none" /></Field>
            <Field label="Tags (comma separated)"><input value={form.tags} onChange={(e) => set('tags', e.target.value)} className="input-field" /></Field>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <Field label="Status"><select value={form.status} onChange={(e) => set('status', e.target.value)} className="input-field" data-testid="pf-status"><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₹) *"><input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} className="input-field" data-testid="pf-price" /></Field>
              <Field label="Sale Price"><input type="number" value={form.sale_price} onChange={(e) => set('sale_price', e.target.value)} className="input-field" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stock"><input type="number" value={form.stock} onChange={(e) => set('stock', e.target.value)} className="input-field" data-testid="pf-stock" /></Field>
              <Field label="Low Stock At"><input type="number" value={form.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} className="input-field" /></Field>
            </div>
          </div>
          <div className="card p-6 space-y-4">
            <Field label="Category">
              <select
                value={form.category_id || ''}
                onChange={(e) => {
                  set('category_id', e.target.value)
                  set('subcategory_id', '')
                }}
                className="input-field"
                data-testid="pf-category"
              >
                <option value="">Select Category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            {form.category_id && subcategories.length > 0 && (
              <Field label="Subcategory">
                <select
                  value={form.subcategory_id || ''}
                  onChange={(e) => set('subcategory_id', e.target.value)}
                  className="input-field"
                  data-testid="pf-subcategory"
                >
                  <option value="">Select Subcategory (Optional)</option>
                  {subcategories.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Brand"><select value={form.brand_id || ''} onChange={(e) => set('brand_id', e.target.value)} className="input-field"><option value="">Select Brand</option>{brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <div className="space-y-2">
              <Toggle label="Featured" checked={form.is_featured} onChange={(v) => set('is_featured', v)} />
              <Toggle label="Best Seller" checked={form.is_best_seller} onChange={(v) => set('is_best_seller', v)} />
              <Toggle label="New Arrival" checked={form.is_new_arrival} onChange={(v) => set('is_new_arrival', v)} />
            </div>
          </div>
          <div className="card p-6 space-y-4">
            <Field label="Warranty"><input value={form.warranty} onChange={(e) => set('warranty', e.target.value)} className="input-field" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight"><input value={form.weight} onChange={(e) => set('weight', e.target.value)} className="input-field" /></Field>
              <Field label="Dimensions"><input value={form.dimensions} onChange={(e) => set('dimensions', e.target.value)} className="input-field" /></Field>
            </div>
          </div>
          <Button type="submit" loading={saving} fullWidth size="lg" data-testid="save-product">{editing ? 'Update Product' : 'Create Product'}</Button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-sm font-medium text-ink-muted mb-1 block">{label}</label>{children}</div>
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center justify-between cursor-pointer"><span className="text-sm">{label}</span><button type="button" onClick={() => onChange(!checked)} className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-line'} relative`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></label>
}
