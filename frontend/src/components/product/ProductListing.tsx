import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { productService, type ProductQuery } from '@/services/productService'
import { brandService } from '@/services/brandService'
import { categoryService } from '@/services/categoryService'
import { ProductGrid } from './ProductGrid'
import { Reveal } from '@/components/common/Reveal'

const SORTS = [
  { v: 'newest', l: 'Newest' },
  { v: 'price_asc', l: 'Price: Low to High' },
  { v: 'price_desc', l: 'Price: High to Low' },
  { v: 'rating', l: 'Top Rated' },
  { v: 'popularity', l: 'Popularity' },
]
const PAGE_SIZE = 12

export function ProductListing({
  base = {},
  title,
  showCategoryFilter = true,
}: {
  base?: ProductQuery
  title: string
  showCategoryFilter?: boolean
}) {
  const [params, setParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const page = parseInt(params.get('page') || '1', 10)
  const sort = (params.get('sort') || 'newest') as any
  const brandId = params.get('brand') || undefined
  const categorySlug = base.categorySlug || params.get('category') || undefined
  const minPrice = params.get('min') ? Number(params.get('min')) : undefined
  const maxPrice = params.get('max') ? Number(params.get('max')) : undefined
  const inStock = params.get('instock') === '1'
  const minRating = params.get('rating') ? Number(params.get('rating')) : undefined

  const query: ProductQuery = { ...base, categorySlug, brandId, sort, page, pageSize: PAGE_SIZE, minPrice, maxPrice, inStock: inStock || base.inStock, minRating }

  const { data, isLoading } = useQuery({ queryKey: ['products', query], queryFn: () => productService.list(query) })
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandService.list() })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoryService.list(), enabled: showCategoryFilter })

  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const setParam = (k: string, v?: string) => {
    const next = new URLSearchParams(params)
    if (v == null || v === '') next.delete(k)
    else next.set(k, v)
    if (k !== 'page') next.set('page', '1')
    setParams(next)
  }
  const clearAll = () => setParams(new URLSearchParams())
  const activeFilters = useMemo(() => ['brand', 'category', 'min', 'max', 'instock', 'rating'].filter((k) => params.get(k)).length, [params])

  const Filters = () => (
    <div className="space-y-6" data-testid="filters">
      {showCategoryFilter && categories.length > 0 && (
        <div>
          <h4 className="font-heading font-semibold mb-3">Category</h4>
          <div className="space-y-1.5">
            <button onClick={() => setParam('category', '')} className={`block text-sm ${!params.get('category') ? 'text-brand font-semibold' : 'text-ink-muted'}`}>All</button>
            {categories.map((c: any) => (
              <button key={c.id} onClick={() => setParam('category', c.slug)} className={`block text-sm ${params.get('category') === c.slug ? 'text-brand font-semibold' : 'text-ink-muted hover:text-ink'}`} data-testid={`filter-cat-${c.slug}`}>{c.name}</button>
            ))}
          </div>
        </div>
      )}
      {brands.length > 0 && (
        <div>
          <h4 className="font-heading font-semibold mb-3">Brand</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <button onClick={() => setParam('brand', '')} className={`block text-sm ${!brandId ? 'text-brand font-semibold' : 'text-ink-muted'}`}>All</button>
            {brands.map((b: any) => (
              <button key={b.id} onClick={() => setParam('brand', b.id)} className={`block text-sm ${brandId === b.id ? 'text-brand font-semibold' : 'text-ink-muted hover:text-ink'}`} data-testid={`filter-brand-${b.id}`}>{b.name}</button>
            ))}
          </div>
        </div>
      )}
      <div>
        <h4 className="font-heading font-semibold mb-3">Price (₹)</h4>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" defaultValue={minPrice} onBlur={(e) => setParam('min', e.target.value)} className="input-field py-2 text-sm" data-testid="filter-min" />
          <span className="text-ink-muted">–</span>
          <input type="number" placeholder="Max" defaultValue={maxPrice} onBlur={(e) => setParam('max', e.target.value)} className="input-field py-2 text-sm" data-testid="filter-max" />
        </div>
      </div>
      <div>
        <h4 className="font-heading font-semibold mb-3">Rating</h4>
        {[4, 3, 2].map((r) => (
          <button key={r} onClick={() => setParam('rating', minRating === r ? '' : String(r))} className={`block text-sm ${minRating === r ? 'text-brand font-semibold' : 'text-ink-muted hover:text-ink'}`}>{r}★ &amp; up</button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={inStock} onChange={(e) => setParam('instock', e.target.checked ? '1' : '')} className="accent-brand w-4 h-4" data-testid="filter-instock" />
        In stock only
      </label>
      {activeFilters > 0 && <button onClick={clearAll} className="text-sm text-brand font-semibold" data-testid="clear-filters">Clear all filters</button>}
    </div>
  )

  return (
    <div className="container-x py-8 md:py-12">
      <Reveal className="mb-8">
        <h1 className="font-heading font-bold text-3xl md:text-4xl tracking-tight">{title}</h1>
        <p className="text-ink-muted mt-1">{total} product{total === 1 ? '' : 's'}</p>
      </Reveal>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="hidden lg:block w-64 shrink-0"><div className="sticky top-40"><Filters /></div></aside>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setDrawerOpen(true)} className="lg:hidden btn-secondary py-2.5" data-testid="open-filters"><SlidersHorizontal className="w-4 h-4" /> Filters{activeFilters ? ` (${activeFilters})` : ''}</button>
            <div className="relative ml-auto">
              <select value={sort} onChange={(e) => setParam('sort', e.target.value)} className="appearance-none input-field py-2.5 pr-10 text-sm cursor-pointer" data-testid="sort-select">
                {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
            </div>
          </div>

          <ProductGrid products={data?.items || []} loading={isLoading} skeletonCount={PAGE_SIZE} />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12" data-testid="pagination">
              <button disabled={page <= 1} onClick={() => setParam('page', String(page - 1))} className="btn-secondary py-2 px-4 disabled:opacity-40">Prev</button>
              {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
                const p = i + 1
                return <button key={p} onClick={() => setParam('page', String(p))} className={`w-10 h-10 rounded-full text-sm font-semibold ${p === page ? 'bg-brand text-white' : 'bg-white border border-line text-ink hover:border-brand'}`}>{p}</button>
              })}
              <button disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))} className="btn-secondary py-2 px-4 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[85%] max-w-xs bg-white overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-semibold text-lg">Filters</h3>
              <button onClick={() => setDrawerOpen(false)} className="p-2"><X className="w-5 h-5" /></button>
            </div>
            <Filters />
            <button onClick={() => setDrawerOpen(false)} className="btn-primary w-full mt-8">Show results</button>
          </div>
        </div>
      )}
    </div>
  )
}
