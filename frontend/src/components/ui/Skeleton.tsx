import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />
}

export function ProductCardSkeleton() {
  return (
    <div className="card p-3">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-3 w-1/3 mt-4" />
      <Skeleton className="h-4 w-4/5 mt-2" />
      <Skeleton className="h-5 w-1/2 mt-3" />
    </div>
  )
}
