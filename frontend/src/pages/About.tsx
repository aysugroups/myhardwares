import { Link } from 'react-router-dom'
import { Target, Gem, Users, ArrowRight } from 'lucide-react'
import { Seo } from '@/components/common/Seo'
import { Reveal } from '@/components/common/Reveal'

export default function About() {
  return (
    <>
      <Seo title="About Us" />
      <section className="bg-gradient-to-b from-brand-light/50 to-white py-16 md:py-24">
        <div className="container-x max-w-3xl">
          <Reveal>
            <span className="chip bg-brand-light text-brand font-semibold mb-4">Our Story</span>
            <h1 className="font-heading font-bold text-4xl md:text-5xl tracking-tight leading-tight">Hardware, reimagined for the modern home &amp; trade</h1>
            <p className="text-ink-muted text-lg mt-6">MY HARDWARES brings showroom-grade locks, fittings and tools online — combining premium quality, honest pricing and fast, reliable delivery across India.</p>
          </Reveal>
        </div>
      </section>
      <section className="container-x py-14 grid md:grid-cols-3 gap-6">
        {[
          { icon: Gem, t: 'Premium Quality', d: 'Every product is quality-checked and sourced from trusted brands.' },
          { icon: Target, t: 'Fair Pricing', d: 'Showroom quality at transparent, competitive online prices.' },
          { icon: Users, t: 'Customer First', d: 'Expert support and easy returns, from browse to delivery.' },
        ].map((v, i) => (
          <Reveal key={v.t} delay={i * 80}>
            <div className="card p-8 h-full"><div className="w-12 h-12 rounded-2xl bg-brand-light flex items-center justify-center mb-4"><v.icon className="w-6 h-6 text-brand" strokeWidth={1.5} /></div><h3 className="font-heading font-semibold text-xl">{v.t}</h3><p className="text-ink-muted mt-2">{v.d}</p></div>
          </Reveal>
        ))}
      </section>
      <section className="container-x pb-16"><div className="rounded-3xl bg-ink text-white p-10 md:p-14 text-center"><h2 className="font-heading font-bold text-3xl">Explore the collection</h2><Link to="/products" className="btn-primary mt-6 inline-flex">Shop Now <ArrowRight className="w-4 h-4" /></Link></div></section>
    </>
  )
}
