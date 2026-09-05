import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Upload, Star, Trash2, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { productAdminService } from '@/services/productAdminService'
import { categoryService } from '@/services/categoryService'
import { brandService } from '@/services/brandService'
import { storageService } from '@/services/storageService'
import { Button } from '@/components/ui/Button'
import { slugify } from '@/lib/utils'

interface SpecItem {
  key: string
  value: string
}

const EMPTY = {
  name: '',
  slug: '',
  sku: '',
  short_description: '',
  description: '',
  category_id: '',
  subcategory_id: '',
  brand_id: '',
  price: '',
  sale_price: '',
  stock: '0',
  low_stock_threshold: '5',
  status: 'published',
  is_featured: false,
  is_best_seller: false,
  is_new_arrival: false,
  weight: '',
  dimensions: '',
  warranty: '',
  tags: '',
  seo_title: '',
  seo_description: '',
}

export default function ProductForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<any>(EMPTY)
  const [specsList, setSpecsList] = useState<SpecItem[]>([])
  const [images, setImages] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [productId, setProductId] = useState<string | null>(id || null)

  const { data: categories = [], isError: catError } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () => {
      try {
        return (await categoryService.list(false)) || []
      } catch (e) {
        console.error('Error fetching categories:', e)
        return []
      }
    },
  })

  const { data: brands = [], isError: brandError } = useQuery({
    queryKey: ['brands', 'all'],
    queryFn: async () => {
      try {
        return (await brandService.list(false)) || []
      } catch (e) {
        console.error('Error fetching brands:', e)
        return []
      }
    },
  })

  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', form?.category_id],
    queryFn: async () => {
      if (!form?.category_id) return []
      try {
        return (await categoryService.subcategories(form.category_id)) || []
      } catch (e) {
        console.error('Error fetching subcategories:', e)
        return []
      }
    },
    enabled: Boolean(form?.category_id),
  })

  const { data: existing } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => {
      if (!id) return null
      try {
        return await productAdminService.getById(id)
      } catch (e) {
        console.error('Error fetching product by ID:', e)
        toast.error('Could not load product details')
        return null
      }
    },
    enabled: editing,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        ...EMPTY,
        ...existing,
        subcategory_id: existing.subcategory_id || '',
        price: String(existing.price ?? ''),
        sale_price: existing.sale_price != null ? String(existing.sale_price) : '',
        stock: String(existing.stock ?? 0),
        low_stock_threshold: String(existing.low_stock_threshold ?? 5),
        tags: Array.isArray(existing.tags) ? existing.tags.join(', ') : '',
      })
      setImages(Array.isArray(existing.images) ? existing.images : [])
      if (existing.specifications && typeof existing.specifications === 'object') {
        const pairs = Object.entries(existing.specifications).map(([key, value]) => ({
          key,
          value: String(value ?? ''),
        }))
        setSpecsList(pairs)
      }
    }
  }, [existing])

  const set = (k: string, v: any) =>
    setForm((f: any) => ({
      ...f,
      [k]: v,
      ...(k === 'name' && !editing ? { slug: slugify(v || '') } : {}),
    }))

  const buildPayload = () => {
    const specsObj: Record<string, string> = {}
    if (Array.isArray(specsList)) {
      specsList.forEach((s) => {
        if (s.key && s.key.trim() && s.value && s.value.trim()) {
          specsObj[s.key.trim()] = s.value.trim()
        }
      })
    }

    return {
      name: (form.name || '').trim(),
      slug: (form.slug || slugify(form.name || '')).trim(),
      sku: (form.sku || '').trim(),
      short_description: (form.short_description || '').trim() || null,
      description: (form.description || '').trim() || null,
      category_id: form.category_id || null,
      subcategory_id: form.subcategory_id || null,
      brand_id: form.brand_id || null,
      price: Number(form.price) || 0,
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      stock: Math.max(0, parseInt(form.stock, 10) || 0),
      low_stock_threshold: Math.max(0, parseInt(form.low_stock_threshold, 10) || 5),
      status: form.status || 'published',
      is_featured: Boolean(form.is_featured),
      is_best_seller: Boolean(form.is_best_seller),
      is_new_arrival: Boolean(form.is_new_arrival),
      weight: (form.weight || '').trim() || null,
      dimensions: (form.dimensions || '').trim() || null,
      warranty: (form.warranty || '').trim() || null,
      tags: form.tags
        ? form.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [],
      specifications: specsObj,
      seo_title: (form.seo_title || '').trim() || null,
      seo_description: (form.seo_description || '').trim() || null,
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name?.trim() || !form.sku?.trim() || !form.price) {
      return toast.error('Name, SKU and Price are required.')
    }
    setSaving(true)
    try {
      const payload = buildPayload()
      if (editing && id) {
        await productAdminService.update(id, payload)
        toast.success('Product updated successfully')
      } else {
        const p = await productAdminService.create(payload)
        setProductId(p.id)
        toast.success('Product created successfully. You can now add images.')
        navigate(`/admin/products/${p.id}/edit`)
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!productId) {
      toast.error('Save the product first to enable image uploads.')
      return
    }
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const { url, path } = await storageService.upload(file)
        const isPrimary = images.length === 0
        const img = await productAdminService.addImage(productId, url, path, isPrimary, images.length)
        setImages((prev) => [...prev, img])
      }
      toast.success('Image(s) uploaded successfully')
    } catch (e: any) {
      toast.error(e.message || 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const delImage = async (img: any) => {
    try {
      await productAdminService.removeImage(img.id)
      if (img.storage_path) {
        await storageService.remove(img.storage_path)
      }
      setImages((p) => p.filter((i) => i.id !== img.id))
      toast.success('Image removed')
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove image')
    }
  }

  const setPrimary = async (img: any) => {
    if (!productId) return
    try {
      await productAdminService.setPrimaryImage(productId, img.id)
      setImages((p) => p.map((i) => ({ ...i, is_primary: i.id === img.id })))
      toast.success('Primary image updated')
    } catch (e: any) {
      toast.error(e.message || 'Failed to update primary image')
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        to="/admin/products"
        className="text-ink-muted hover:text-brand flex items-center gap-1 text-sm mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to products
      </Link>
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6">
        {editing ? 'Edit Product' : 'Add Product'}
      </h1>

      <form onSubmit={save} className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Info, Images, Specs, SEO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-4">
            <Field label="Product Name *">
              <input
                value={form.name || ''}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Mortise Handle Lock Set"
                className="input-field"
                data-testid="pf-name"
                required
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Slug (URL identifier)">
                <input
                  value={form.slug || ''}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder="e.g. mortise-handle-lock-set"
                  className="input-field"
                />
              </Field>
              <Field label="SKU (Stock Keeping Unit) *">
                <input
                  value={form.sku || ''}
                  onChange={(e) => set('sku', e.target.value)}
                  placeholder="e.g. MH-LK-001"
                  className="input-field"
                  data-testid="pf-sku"
                  required
                />
              </Field>
            </div>
            <Field label="Short Description">
              <input
                value={form.short_description || ''}
                onChange={(e) => set('short_description', e.target.value)}
                placeholder="Brief one-line summary"
                className="input-field"
              />
            </Field>
            <Field label="Full Description">
              <textarea
                rows={5}
                value={form.description || ''}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Detailed product information, features, and benefits..."
                className="input-field resize-none"
              />
            </Field>
          </div>

          {/* Images */}
          <div className="card p-6 space-y-4">
            <h3 className="font-heading font-semibold text-ink">Images</h3>
            <div className="flex flex-wrap gap-3">
              {Array.isArray(images) &&
                images.map((img) => (
                  <div
                    key={img.id}
                    className="relative w-24 h-24 rounded-xl overflow-hidden border border-line group bg-warm"
                  >
                    <img src={img.url} className="w-full h-full object-cover" alt="" />
                    {img.is_primary && (
                      <span className="absolute top-1 left-1 chip bg-brand text-white text-[9px] px-1.5 shadow-sm">
                        Primary
                      </span>
                    )}
                    <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {!img.is_primary && (
                        <button
                          type="button"
                          onClick={() => setPrimary(img)}
                          className="p-1.5 bg-white rounded-lg text-brand hover:scale-105 transition-transform"
                          title="Set as primary"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => delImage(img)}
                        className="p-1.5 bg-white rounded-lg text-red-500 hover:scale-105 transition-transform"
                        title="Delete image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              <label
                className={`w-24 h-24 rounded-xl border-2 border-dashed border-line flex flex-col items-center justify-center text-ink-muted transition-colors ${
                  productId
                    ? 'cursor-pointer hover:border-brand hover:text-brand bg-warm/50 hover:bg-white'
                    : 'opacity-60 cursor-not-allowed bg-warm/30'
                }`}
                data-testid="upload-image"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-brand" />
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px] mt-1 font-medium">Upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  disabled={!productId || uploading}
                  onChange={(e) => onUpload(e.target.files)}
                />
              </label>
            </div>
            {!productId && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                💡 Tip: Save/create the product first to enable uploading images directly to it.
              </p>
            )}
          </div>

          {/* Specifications */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-ink">Specifications</h3>
              <button
                type="button"
                onClick={() => setSpecsList((prev) => [...prev, { key: '', value: '' }])}
                className="text-brand text-xs font-semibold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add Spec
              </button>
            </div>
            {specsList.length === 0 ? (
              <p className="text-xs text-ink-muted">
                No specifications added yet (e.g. Material, Finish, Lock Type, Dimensions).
              </p>
            ) : (
              <div className="space-y-2">
                {specsList.map((spec, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      placeholder="Name (e.g. Material)"
                      value={spec.key}
                      onChange={(e) => {
                        const val = e.target.value
                        setSpecsList((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, key: val } : item)),
                        )
                      }}
                      className="input-field py-2 text-sm flex-1"
                    />
                    <input
                      placeholder="Value (e.g. Brass)"
                      value={spec.value}
                      onChange={(e) => {
                        const val = e.target.value
                        setSpecsList((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, value: val } : item)),
                        )
                      }}
                      className="input-field py-2 text-sm flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setSpecsList((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-ink-muted hover:text-red-500 rounded-lg hover:bg-warm transition-colors"
                      title="Remove specification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEO */}
          <div className="card p-6 space-y-4">
            <h3 className="font-heading font-semibold text-ink">Search Engine Optimization (SEO)</h3>
            <Field label="SEO Title">
              <input
                value={form.seo_title || ''}
                onChange={(e) => set('seo_title', e.target.value)}
                placeholder="Custom title for search results"
                className="input-field"
              />
            </Field>
            <Field label="SEO Description">
              <textarea
                rows={2}
                value={form.seo_description || ''}
                onChange={(e) => set('seo_description', e.target.value)}
                placeholder="Meta description for search engines"
                className="input-field resize-none"
              />
            </Field>
            <Field label="Tags (comma separated)">
              <input
                value={form.tags || ''}
                onChange={(e) => set('tags', e.target.value)}
                placeholder="door lock, brass, hardware, security"
                className="input-field"
              />
            </Field>
          </div>
        </div>

        {/* Right 1 Col: Pricing, Inventory, Classification, Shipping */}
        <div className="space-y-6">
          {/* Pricing & Status */}
          <div className="card p-6 space-y-4">
            <Field label="Product Status">
              <select
                value={form.status || 'published'}
                onChange={(e) => set('status', e.target.value)}
                className="input-field"
                data-testid="pf-status"
              >
                <option value="published">Published (Active)</option>
                <option value="draft">Draft (Hidden)</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Regular Price (₹) *">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price || ''}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="0.00"
                  className="input-field"
                  data-testid="pf-price"
                  required
                />
              </Field>
              <Field label="Sale Price (₹)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sale_price || ''}
                  onChange={(e) => set('sale_price', e.target.value)}
                  placeholder="Optional"
                  className="input-field"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stock Count *">
                <input
                  type="number"
                  min="0"
                  value={form.stock ?? '0'}
                  onChange={(e) => set('stock', e.target.value)}
                  placeholder="0"
                  className="input-field"
                  data-testid="pf-stock"
                  required
                />
              </Field>
              <Field label="Low Stock Alert At">
                <input
                  type="number"
                  min="0"
                  value={form.low_stock_threshold ?? '5'}
                  onChange={(e) => set('low_stock_threshold', e.target.value)}
                  placeholder="5"
                  className="input-field"
                />
              </Field>
            </div>
          </div>

          {/* Classification */}
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
                {Array.isArray(categories) &&
                  categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>

            {form.category_id && Array.isArray(subcategories) && subcategories.length > 0 && (
              <Field label="Subcategory">
                <select
                  value={form.subcategory_id || ''}
                  onChange={(e) => set('subcategory_id', e.target.value)}
                  className="input-field"
                  data-testid="pf-subcategory"
                >
                  <option value="">Select Subcategory (Optional)</option>
                  {subcategories.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Brand">
              <select
                value={form.brand_id || ''}
                onChange={(e) => set('brand_id', e.target.value)}
                className="input-field"
              >
                <option value="">Select Brand</option>
                {Array.isArray(brands) &&
                  brands.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </Field>

            <div className="space-y-3 pt-2 border-t border-line">
              <Toggle
                label="Featured Product"
                checked={Boolean(form.is_featured)}
                onChange={(v) => set('is_featured', v)}
              />
              <Toggle
                label="Best Seller"
                checked={Boolean(form.is_best_seller)}
                onChange={(v) => set('is_best_seller', v)}
              />
              <Toggle
                label="New Arrival"
                checked={Boolean(form.is_new_arrival)}
                onChange={(v) => set('is_new_arrival', v)}
              />
            </div>
          </div>

          {/* Physical Attributes & Warranty */}
          <div className="card p-6 space-y-4">
            <Field label="Warranty">
              <input
                value={form.warranty || ''}
                onChange={(e) => set('warranty', e.target.value)}
                placeholder="e.g. 2 Years Manufacturer Warranty"
                className="input-field"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight">
                <input
                  value={form.weight || ''}
                  onChange={(e) => set('weight', e.target.value)}
                  placeholder="e.g. 450g"
                  className="input-field"
                />
              </Field>
              <Field label="Dimensions">
                <input
                  value={form.dimensions || ''}
                  onChange={(e) => set('dimensions', e.target.value)}
                  placeholder="e.g. 15x5x3 cm"
                  className="input-field"
                />
              </Field>
            </div>
          </div>

          <Button
            type="submit"
            loading={saving}
            fullWidth
            size="lg"
            data-testid="save-product"
          >
            {editing ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-ink mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-0.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
          checked ? 'bg-brand' : 'bg-gray-200'
        }`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}
