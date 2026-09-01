import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { productService, type ProductQuery } from '@/services/productService'
import { ProductGrid } from '@/components/product/ProductGrid'
import { Reveal } from '@/components/common/Reveal'

interface Props {
  title: string
  eyebrow: string
  query: ProductQuery
  viewAllTo?: string
  queryKey: string
}

export function ProductRail({ title, eyebrow, query, viewAllTo = '/products', queryKey }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['rail', queryKey],
    queryFn: () => productService.list({ ...query, pageSize: 4 }),
  })
  const products = data?.items || []

  if (!isLoading && products.length === 0) return null

  return (
    <section className="container-x py-10 md:py-14">
      <Reveal className="flex items-end justify-between mb-8">
        <div>
          <p className="text-brand font-semibold uppercase tracking-wide text-sm">{eyebrow}</p>
          <h2 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mt-1">{title}</h2>
        </div>
        <Link to={viewAllTo} className="hidden sm:flex items-center gap-1.5 text-brand font-semibold hover:gap-2.5 transition-all" data-testid={`rail-viewall-${queryKey}`}>View all <ArrowRight className="w-4 h-4" /></Link>
      </Reveal>
      <ProductGrid products={products} loading={isLoading} skeletonCount={4} />
    </section>
  )
}
