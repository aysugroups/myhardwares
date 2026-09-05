import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Truck, Star, Sparkles } from 'lucide-react'

const HERO_IMG = 'https://images.unsplash.com/photo-1583691028182-e8f01e74bfa2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-light/60 via-white to-white">
      {/* decorative shapes */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute top-40 left-10 w-8 h-8 rounded-lg border-2 border-brand/30 rotate-12 hidden md:block" />
      <div className="pointer-events-none absolute bottom-20 right-1/3 w-4 h-4 rounded-full bg-brand/40 hidden md:block" />

      <div className="container-x grid lg:grid-cols-2 gap-12 items-center py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="chip bg-brand-light text-brand font-semibold mb-5"><Sparkles className="w-3.5 h-3.5" /> Premium Hardware, Delivered</span>
          <h1 className="font-heading font-bold text-3xl sm:text-5xl lg:text-6xl leading-[1.1] sm:leading-[1.05] tracking-tight text-ink">
            Hardware that feels <span className="text-brand">expensive</span>, priced to trust.
          </h1>
          <p className="text-ink-muted text-base sm:text-lg mt-4 sm:mt-6 max-w-lg">
            Locks, fittings, kitchen &amp; architectural hardware and pro tools — curated for durability and finish. Shop a showroom-grade collection online.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8">
            <Link to="/products" className="btn-primary text-center justify-center min-h-[44px]" data-testid="hero-shop-now">Shop Now <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/categories" className="btn-secondary text-center justify-center min-h-[44px]" data-testid="hero-explore">Explore Products</Link>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6 mt-8 sm:mt-10 text-xs sm:text-sm">
            <span className="flex items-center gap-1.5 sm:gap-2 text-ink-muted"><Truck className="w-4 h-4 text-brand shrink-0" /> Fast delivery</span>
            <span className="flex items-center gap-1.5 sm:gap-2 text-ink-muted"><ShieldCheck className="w-4 h-4 text-brand shrink-0" /> Genuine products</span>
            <span className="flex items-center gap-1.5 sm:gap-2 text-ink-muted"><Star className="w-4 h-4 text-brand fill-brand shrink-0" /> Trusted quality</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative rounded-[2rem] overflow-hidden shadow-card aspect-[4/5] max-w-md mx-auto bg-warm">
            <img src={HERO_IMG} alt="Premium hardware" className="w-full h-full object-cover" />
          </div>
          <motion.div
            animate={{ y: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-4 top-10 card p-4 shadow-card hidden sm:block"
          >
            <p className="text-xs text-ink-muted">Best Seller</p>
            <p className="font-heading font-bold text-brand">Smart Door Locks</p>
          </motion.div>
          <motion.div
            animate={{ y: [0, 12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-2 bottom-16 card p-4 shadow-card hidden sm:flex items-center gap-2"
          >
            <div className="flex"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /><Star className="w-4 h-4 fill-amber-400 text-amber-400" /><Star className="w-4 h-4 fill-amber-400 text-amber-400" /><Star className="w-4 h-4 fill-amber-400 text-amber-400" /><Star className="w-4 h-4 fill-amber-400 text-amber-400" /></div>
            <span className="text-xs font-semibold">Showroom grade</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
