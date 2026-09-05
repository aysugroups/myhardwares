import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Heart, ShoppingBag, User, Menu, X, ChevronDown, Truck, Phone, ShieldCheck, Tag } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { categoryService } from '@/services/categoryService'
import { productService } from '@/services/productService'
import { settingsService } from '@/services/settingsService'
import { formatINR } from '@/lib/utils'

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Products', to: '/products' },
  { label: 'Categories', to: '/categories' },
  { label: 'Deals', to: '/deals' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Track Order', to: '/track-order' },
]

export function Header() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [showSuggest, setShowSuggest] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [acctOpen, setAcctOpen] = useState(false)
  const count = useCartStore((s) => s.count())
  const setCartOpen = useUIStore((s) => s.setCartOpen)
  const menuOpen = useUIStore((s) => s.menuOpen)
  const setMenuOpen = useUIStore((s) => s.setMenuOpen)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const searchRef = useRef<HTMLDivElement>(null)

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => settingsService.get() })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoryService.list() })
  const { data: suggestions = [] } = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: () => productService.suggest(debounced),
    enabled: debounced.length >= 2,
  })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300)
    return () => clearTimeout(t)
  }, [term])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggest(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!term.trim()) return
    setShowSuggest(false)
    navigate(`/search?q=${encodeURIComponent(term.trim())}`)
  }

  return (
    <header className="sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-ink text-white/90 text-xs hidden md:block">
        <div className="container-x flex items-center justify-between py-2">
          <div className="flex items-center gap-6">
            {settings?.announcement ? (
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-brand" /> {settings.announcement}</span>
            ) : (
              <>
                <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-brand" /> Fast Delivery</span>
                <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-brand" /> Best Hardware Deals</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-brand" /> Quality You Can Trust</span>
              </>
            )}
          </div>
          <a href={`tel:${settings?.phone || '+919000000000'}`} className="flex items-center gap-1.5 hover:text-brand transition-colors">
            <Phone className="w-3.5 h-3.5" /> Need Help? {settings?.phone || '+91 90000 00000'}
          </a>
        </div>
      </div>

      {/* Main header */}
      <div className={`bg-white/90 backdrop-blur-xl border-b border-gray-100 transition-shadow duration-300 ${scrolled ? 'shadow-dropdown' : ''}`}>
        <div className="container-x flex items-center gap-4 py-3.5">
          <button className="lg:hidden p-2 -ml-2 text-ink" onClick={() => setMenuOpen(true)} data-testid="mobile-menu-btn" aria-label="Menu">
            <Menu className="w-6 h-6" />
          </button>

          <Link to="/" className="flex items-center shrink-0" data-testid="logo-link">
            <img src="/logo-full.png" alt="MY HARDWARES" className="h-12 md:h-14 w-auto max-w-[150px] object-contain shrink-0" />
          </Link>

          {/* Search */}
          <div ref={searchRef} className="hidden md:block flex-1 relative max-w-2xl mx-auto">
            <form onSubmit={submitSearch}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
                <input
                  value={term}
                  onChange={(e) => { setTerm(e.target.value); setShowSuggest(true) }}
                  onFocus={() => setShowSuggest(true)}
                  placeholder="Search locks, handles, tools..."
                  data-testid="search-input"
                  className="w-full rounded-full border border-line bg-warm pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand focus:bg-white transition-all duration-300"
                />
              </div>
            </form>
            <AnimatePresence>
              {showSuggest && debounced.length >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-dropdown border border-gray-100 overflow-hidden z-50"
                >
                  {suggestions.length ? (
                    suggestions.map((s: any) => (
                      <Link
                        key={s.id} to={`/products/${s.slug}`} onClick={() => setShowSuggest(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-warm transition-colors"
                        data-testid={`suggestion-${s.slug}`}
                      >
                        <img src={s.primary_image} alt="" className="w-10 h-10 rounded-lg object-cover bg-warm" />
                        <span className="flex-1 text-sm text-ink line-clamp-1">{s.name}</span>
                        <span className="text-sm font-semibold text-brand">{formatINR(s.sale_price || s.price)}</span>
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-ink-muted text-center">No matches. Press Enter to search.</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1 md:gap-2 ml-auto md:ml-0">
            <Link to={user ? '/account/wishlist' : '/login'} className="p-2.5 rounded-full hover:bg-brand-light text-ink hover:text-brand transition-colors hidden sm:flex" data-testid="wishlist-link" aria-label="Wishlist">
              <Heart className="w-5.5 h-5.5" style={{ width: 22, height: 22 }} />
            </Link>

            <button onClick={() => setCartOpen(true)} className="relative p-2.5 rounded-full hover:bg-brand-light text-ink hover:text-brand transition-colors" data-testid="cart-btn" aria-label="Cart">
              <ShoppingBag className="w-5.5 h-5.5" style={{ width: 22, height: 22 }} />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center"
                    data-testid="cart-badge"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Account */}
            <div className="relative hidden md:block" onMouseEnter={() => setAcctOpen(true)} onMouseLeave={() => setAcctOpen(false)}>
              <Link to={user ? '/account' : '/login'} className="p-2.5 rounded-full hover:bg-brand-light text-ink hover:text-brand transition-colors flex items-center" data-testid="account-link" aria-label="Account">
                <User className="w-5.5 h-5.5" style={{ width: 22, height: 22 }} />
              </Link>
              <AnimatePresence>
                {acctOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-full w-56 bg-white rounded-2xl shadow-dropdown border border-gray-100 p-2"
                  >
                    {user ? (
                      <>
                        <div className="px-3 py-2 text-sm"><p className="font-semibold text-ink line-clamp-1">{user.full_name}</p><p className="text-ink-muted text-xs line-clamp-1">{user.email}</p></div>
                        <div className="h-px bg-line my-1" />
                        <Link to="/account" className="block px-3 py-2 rounded-xl hover:bg-warm text-sm text-ink">Dashboard</Link>
                        <Link to="/account/orders" className="block px-3 py-2 rounded-xl hover:bg-warm text-sm text-ink">My Orders</Link>
                        <Link to="/account/wishlist" className="block px-3 py-2 rounded-xl hover:bg-warm text-sm text-ink">Wishlist</Link>
                        <Link to="/account/addresses" className="block px-3 py-2 rounded-xl hover:bg-warm text-sm text-ink">Addresses</Link>
                        {user.role === 'admin' && <Link to="/admin" className="block px-3 py-2 rounded-xl hover:bg-brand-light text-sm text-brand font-semibold">Admin Panel</Link>}
                        <div className="h-px bg-line my-1" />
                        <button onClick={() => logout()} className="w-full text-left px-3 py-2 rounded-xl hover:bg-warm text-sm text-red-500" data-testid="logout-btn">Logout</button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" className="block px-3 py-2 rounded-xl hover:bg-warm text-sm text-ink" data-testid="menu-login">Login</Link>
                        <Link to="/register" className="block px-3 py-2 rounded-xl hover:bg-brand-light text-sm text-brand font-semibold" data-testid="menu-register">Create Account</Link>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden lg:block border-t border-gray-100">
          <div className="container-x flex items-center gap-1">
            <div className="relative" onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
              <button className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-ink hover:text-brand transition-colors" data-testid="nav-categories-dropdown">
                All Categories <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {catOpen && categories.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 top-full w-64 bg-white rounded-2xl shadow-dropdown border border-gray-100 p-2 grid"
                  >
                    {categories.map((c: any) => (
                      <Link key={c.id} to={`/category/${c.slug}`} className="px-3 py-2 rounded-xl hover:bg-warm text-sm text-ink flex items-center gap-3">
                        {c.image_url && <img src={c.image_url} className="w-8 h-8 rounded-lg object-cover" alt="" />}
                        {c.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="px-4 py-3 text-sm font-medium text-ink-muted hover:text-brand transition-colors" data-testid={`nav-${n.label.toLowerCase().replace(' ', '-')}`}>
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Mobile search */}
      <div className="md:hidden bg-white border-b border-gray-100 px-4 py-2.5">
        <form onSubmit={submitSearch} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-muted" style={{ width: 18, height: 18 }} />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search hardware..." data-testid="search-input-mobile" className="w-full rounded-full border border-line bg-warm pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
        </form>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} categories={categories} user={user} logout={logout} />
    </header>
  )
}

function MobileMenu({ open, onClose, categories, user, logout }: any) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-0 h-full w-[85%] max-w-sm bg-white overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-line">
              <Link to="/" onClick={onClose} className="flex items-center">
                <img src="/logo-full.png" alt="MY HARDWARES" className="h-10 w-auto max-w-[130px] object-contain" />
              </Link>
              <button onClick={onClose} className="p-2 text-ink" data-testid="mobile-menu-close"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-4 space-y-1">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} onClick={onClose} className="block px-3 py-3 rounded-xl hover:bg-warm font-medium text-ink">{n.label}</Link>
              ))}
              <div className="h-px bg-line my-2" />
              <p className="px-3 py-1 text-xs font-semibold uppercase text-ink-muted">Categories</p>
              {categories.map((c: any) => (
                <Link key={c.id} to={`/category/${c.slug}`} onClick={onClose} className="block px-3 py-2.5 rounded-xl hover:bg-warm text-sm text-ink">{c.name}</Link>
              ))}
              <div className="h-px bg-line my-2" />
              {user ? (
                <>
                  <Link to="/account" onClick={onClose} className="block px-3 py-3 rounded-xl hover:bg-warm font-medium text-ink">My Account</Link>
                  {user.role === 'admin' && <Link to="/admin" onClick={onClose} className="block px-3 py-3 rounded-xl hover:bg-brand-light font-semibold text-brand">Admin Panel</Link>}
                  <button onClick={() => { logout(); onClose() }} className="w-full text-left px-3 py-3 rounded-xl text-red-500">Logout</button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link to="/login" onClick={onClose} className="btn-secondary text-center">Login</Link>
                  <Link to="/register" onClick={onClose} className="btn-primary text-center">Register</Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
