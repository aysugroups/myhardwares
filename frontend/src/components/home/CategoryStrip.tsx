import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { categoryService } from '@/services/categoryService'
import { Reveal } from '@/components/common/Reveal'
import { Skeleton } from '@/components/ui/Skeleton'

export function CategoryStrip() {
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: () => categoryService.list() })

  return (
    <section className="container-x py-16 md:py-20">
      <Reveal className="flex items-end justify-between mb-8">
        <div>
          <p className="text-brand font-semibold uppercase tracking-wide text-sm">Browse the range</p>
          <h2 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mt-1">Shop by Category</h2>
        </div>
        <Link to="/categories" className="hidden sm:flex items-center gap-1.5 text-brand font-semibold hover:gap-2.5 transition-all">View all <ArrowRight className="w-4 h-4" /></Link>
      </Reveal>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5]" />)}</div>
      ) : categories.length === 0 ? (
        <p className="text-ink-muted">Categories will appear here once added in the admin panel.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.slice(0, 6).map((c: any, i: number) => (
            <Reveal key={c.id} delay={i * 60}>
              <Link to={`/category/${c.slug}`} className="group block relative rounded-2xl overflow-hidden aspect-[4/5] bg-warm border border-gray-100" data-testid={`category-card-${c.slug}`}>
                {c.image_url && <img src={c.image_url} alt={c.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-heading font-semibold text-lg leading-tight">{c.name}</p>
                  <span className="text-white/80 text-xs flex items-center gap-1 mt-1 group-hover:gap-2 transition-all">Shop now <ArrowRight className="w-3 h-3" /></span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  )
}
