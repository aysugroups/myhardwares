import { effectivePrice, formatINR, discountPercent } from '@/lib/utils'

export function PriceTag({ price, salePrice, size = 'md' }: { price: number; salePrice?: number | null; size?: 'sm' | 'md' | 'lg' }) {
  const eff = effectivePrice({ price, sale_price: salePrice })
  const off = discountPercent(price, salePrice)
  const cls = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-lg'
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className={`font-heading font-bold text-ink ${cls}`}>{formatINR(eff)}</span>
      {off > 0 && (
        <>
          <span className="text-ink-muted line-through text-sm">{formatINR(price)}</span>
          <span className="chip bg-green-100 text-green-700">{off}% OFF</span>
        </>
      )}
    </div>
  )
}
