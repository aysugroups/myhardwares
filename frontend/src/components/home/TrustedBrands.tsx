import { useQuery } from '@tanstack/react-query'
import { brandService } from '@/services/brandService'
import { Reveal } from '@/components/common/Reveal'

export function TrustedBrands() {
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandService.list() })
  if (!brands.length) return null
  return (
    <section className="container-x py-14">
      <Reveal className="text-center mb-10">
        <p className="text-brand font-semibold uppercase tracking-wide text-sm">Trusted brands</p>
        <h2 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mt-1">Only the names you can rely on</h2>
      </Reveal>
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
        {brands.map((b: any) => (
          <div key={b.id} className="card px-6 py-4 flex items-center justify-center min-w-[140px] h-20 grayscale hover:grayscale-0 transition-all">
            {b.logo_url ? <img src={b.logo_url} alt={b.name} className="max-h-10 object-contain" /> : <span className="font-heading font-semibold text-ink-muted">{b.name}</span>}
          </div>
        ))}
      </div>
    </section>
  )
}
