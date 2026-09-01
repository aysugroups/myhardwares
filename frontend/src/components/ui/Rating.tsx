import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Rating({ value = 0, count, size = 14, showCount = true }: { value?: number; count?: number; size?: number; showCount?: boolean }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Rated ${value} out of 5`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={cn(i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')}
          />
        ))}
      </div>
      {showCount && (
        <span className="text-xs text-ink-muted">
          {value ? value.toFixed(1) : 'New'}{count != null ? ` (${count})` : ''}
        </span>
      )}
    </div>
  )
}
