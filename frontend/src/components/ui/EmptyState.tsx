import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { PackageOpen } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon = PackageOpen, title, description, action, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-20 px-6', className)} data-testid="empty-state">
      <div className="w-20 h-20 rounded-3xl bg-brand-light flex items-center justify-center mb-6">
        <Icon className="w-9 h-9 text-brand" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-heading font-semibold text-ink">{title}</h3>
      {description && <p className="text-ink-muted mt-2 max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
