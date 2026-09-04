import { Reveal } from '@/components/common/Reveal'
import { Truck, ShieldCheck, RefreshCw, Headphones, BadgeCheck, CreditCard } from 'lucide-react'

const FEATURES = [
  { icon: BadgeCheck, title: '100% Genuine', desc: 'Authentic branded hardware, quality-checked before dispatch.' },
  { icon: Truck, title: 'Fast Delivery', desc: 'Quick, reliable shipping across India with live tracking.' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: 'Direct UPI QR payment with instant WhatsApp order dispatch.' },
  { icon: RefreshCw, title: 'Easy Returns', desc: 'Hassle-free returns on eligible products.' },
  { icon: Headphones, title: 'Expert Support', desc: 'Hardware specialists ready to help you choose right.' },
  { icon: CreditCard, title: 'Best Prices', desc: 'Showroom quality at competitive online prices.' },
]

export function WhyUs() {
  return (
    <section className="bg-warm py-16 md:py-20">
      <div className="container-x">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-brand font-semibold uppercase tracking-wide text-sm">Why MY HARDWARES</p>
          <h2 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mt-1">Built on trust, finished to perfection</h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div className="card p-6 h-full hover:shadow-card transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-brand-light flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-brand" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading font-semibold text-lg">{f.title}</h3>
                <p className="text-ink-muted mt-1.5 text-sm">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
