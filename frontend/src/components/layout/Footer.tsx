import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter, Youtube, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function Footer() {
  const [email, setEmail] = useState('')
  const subscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    toast.success('Thanks for subscribing!')
    setEmail('')
  }
  return (
    <footer className="bg-warm border-t border-gray-100 mt-24">
      {/* Newsletter */}
      <div className="container-x py-14">
        <div className="rounded-3xl bg-gradient-to-r from-brand to-brand-soft p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-heading font-bold text-2xl md:text-3xl">Join the MY HARDWARES insider list</h3>
            <p className="text-white/90 mt-2">Get early access to premium deals and new arrivals.</p>
          </div>
          <form onSubmit={subscribe} className="flex w-full md:w-auto gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="Enter your email" data-testid="newsletter-input" className="flex-1 md:w-72 rounded-full px-5 py-3 text-ink focus:outline-none" />
            <button className="bg-white text-brand rounded-full px-6 py-3 font-semibold flex items-center gap-2 hover:bg-ink hover:text-white transition-colors" data-testid="newsletter-submit"><Send className="w-4 h-4" /> Subscribe</button>
          </form>
        </div>
      </div>

      <div className="container-x pb-14 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        <div className="col-span-2 lg:col-span-2">
          <img src="/logo-full.png" alt="MY HARDWARES" className="h-10 mb-4" />
          <p className="text-ink-muted text-sm max-w-sm">Premium locks, furniture fittings, kitchen &amp; architectural hardware, tools and accessories. Quality you can trust.</p>
          <div className="flex gap-2 mt-5">
            {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-full bg-white border border-line flex items-center justify-center text-ink-muted hover:text-brand hover:border-brand transition-colors"><Icon className="w-4 h-4" /></a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-4">Shop</h4>
          <ul className="space-y-2.5 text-sm text-ink-muted">
            <li><Link to="/products" className="hover:text-brand">All Products</Link></li>
            <li><Link to="/categories" className="hover:text-brand">Categories</Link></li>
            <li><Link to="/deals" className="hover:text-brand">Deals</Link></li>
            <li><Link to="/track-order" className="hover:text-brand">Track Order</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-4">Company</h4>
          <ul className="space-y-2.5 text-sm text-ink-muted">
            <li><Link to="/about" className="hover:text-brand">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-brand">Contact</Link></li>
            <li><Link to="/privacy" className="hover:text-brand">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-brand">Terms &amp; Conditions</Link></li>
            <li><Link to="/shipping" className="hover:text-brand">Shipping Policy</Link></li>
            <li><Link to="/refund" className="hover:text-brand">Refund Policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-4">Get in touch</h4>
          <ul className="space-y-2.5 text-sm text-ink-muted">
            <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-brand" /> +91 90000 00000</li>
            <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-brand" /> support@myhardwares.com</li>
            <li className="flex items-start gap-2"><MapPin className="w-4 h-4 text-brand mt-0.5" /> India</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <div className="container-x py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-ink-muted">
          <p>© {new Date().getFullYear()} MY HARDWARES. All rights reserved.</p>
          <p>Secure payments powered by Razorpay</p>
        </div>
      </div>
    </footer>
  )
}
