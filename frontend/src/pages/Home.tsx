import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Seo } from '@/components/common/Seo'
import { Hero } from '@/components/home/Hero'
import { CategoryStrip } from '@/components/home/CategoryStrip'
import { ProductRail } from '@/components/home/ProductRail'
import { WhyUs } from '@/components/home/WhyUs'
import { PromoBanner } from '@/components/home/PromoBanner'
import { TrustedBrands } from '@/components/home/TrustedBrands'
import { Reveal } from '@/components/common/Reveal'

export default function Home() {
  return (
    <>
      <Seo />
      <Hero />
      <CategoryStrip />
      <ProductRail eyebrow="Handpicked" title="Featured Products" query={{ featured: true }} queryKey="featured" />
      <ProductRail eyebrow="Most loved" title="Best Sellers" query={{ bestSeller: true, sort: 'popularity' }} queryKey="bestsellers" />
      <ProductRail eyebrow="Just landed" title="New Arrivals" query={{ newArrival: true, sort: 'newest' }} queryKey="newarrivals" />
      <PromoBanner />
      <ProductRail eyebrow="Save more" title="Premium Deals" query={{ onSale: true }} viewAllTo="/deals" queryKey="deals" />
      <WhyUs />
      <TrustedBrands />

      {/* CTA */}
      <section className="container-x py-16">
        <Reveal>
          <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-brand-light/60 to-white p-10 md:p-16 text-center">
            <h2 className="font-heading font-bold text-3xl md:text-4xl tracking-tight">Ready to build something great?</h2>
            <p className="text-ink-muted mt-3 max-w-xl mx-auto">Browse the full MY HARDWARES catalog and get premium hardware delivered to your door.</p>
            <Link to="/products" className="btn-primary mt-8 inline-flex" data-testid="cta-shop-btn">Start Shopping <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </Reveal>
      </section>
    </>
  )
}
