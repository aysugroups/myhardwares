import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Seo } from '@/components/common/Seo'
import { categoryService } from '@/services/categoryService'
import { Reveal } from '@/components/common/Reveal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { LayoutGrid } from 'lucide-react'

export default function Categories() {
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: () => categoryService.list() })
  return (
    <>
      <Seo title="All Categories" />
      <div className="container-x py-8 md:py-12">
        <Reveal className="mb-8">
          <h1 className="font-heading font-bold text-3xl md:text-4xl tracking-tight">Shop by Category</h1>
          <p className="text-ink-muted mt-1">Find the right hardware, faster.</p>
        </Reveal>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3]" />)}</div>
        ) : categories.length === 0 ? (
          <EmptyState icon={LayoutGrid} title="No categories yet" description="Categories added in the admin panel will appear here." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {categories.map((c: any, i: number) => (
              <Reveal key={c.id} delay={i * 50}>
                <Link to={`/category/${c.slug}`} className="group block relative rounded-2xl overflow-hidden aspect-[4/3] bg-warm border border-gray-100" data-testid={`category-tile-${c.slug}`}>
                  {c.image_url && <img src={c.image_url} alt={c.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                  <div className="absolute bottom-0 p-5">
                    <p className="text-white font-heading font-semibold text-xl">{c.name}</p>
                    <span className="text-white/80 text-sm flex items-center gap-1 mt-1 group-hover:gap-2 transition-all">Explore <ArrowRight className="w-4 h-4" /></span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
