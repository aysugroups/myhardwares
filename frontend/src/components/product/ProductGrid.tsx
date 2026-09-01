import { ProductCard } from './ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PackageOpen } from 'lucide-react'

export function ProductGrid({
  products,
  loading,
  skeletonCount = 8,
  emptyTitle = 'No products found',
  emptyDescription = 'Try adjusting your filters or check back soon.',
}: {
  products: any[]
  loading?: boolean
  skeletonCount?: number
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }
  if (!products?.length) {
    return <EmptyState icon={PackageOpen} title={emptyTitle} description={emptyDescription} />
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6" data-testid="product-grid">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} />
      ))}
    </div>
  )
}
