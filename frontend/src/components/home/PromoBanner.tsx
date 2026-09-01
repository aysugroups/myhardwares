import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export function PromoBanner() {
  return (
    <section className="container-x py-10 md:py-14">
      <div className="relative overflow-hidden rounded-3xl bg-ink text-white p-10 md:p-16">
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-brand/30 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 w-40 h-40 rounded-full bg-brand/20 blur-2xl" />
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative max-w-xl">
          <p className="text-brand font-semibold uppercase tracking-wide text-sm">Limited time</p>
          <h2 className="font-heading font-bold text-3xl md:text-5xl mt-2 leading-tight">Upgrade your space with premium fittings</h2>
          <p className="text-white/80 mt-4">Explore curated deals on locks, handles and kitchen hardware. Quality that lasts, savings you'll love.</p>
          <Link to="/deals" className="btn-primary mt-8" data-testid="promo-deals-btn">Explore Deals <ArrowRight className="w-4 h-4" /></Link>
        </motion.div>
      </div>
    </section>
  )
}
