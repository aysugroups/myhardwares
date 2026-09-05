import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  LayoutDashboard, ShoppingCart, Package, LayoutGrid, Tag as TagIcon, Boxes,
  Users, Star, Ticket, Image, BarChart3, Settings, Bell, LogOut, Menu, X, ExternalLink,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { notificationService } from '@/services/notificationService'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { cn, formatDateTime } from '@/lib/utils'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: LayoutGrid },
  { to: '/admin/brands', label: 'Brands', icon: TagIcon },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { to: '/admin/banners', label: 'Banners', icon: Image },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [sidebar, setSidebar] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])
  const [bellOpen, setBellOpen] = useState(false)

  useEffect(() => {
    notificationService.listAdmin().then(setNotifs)
    const unsub = notificationService.subscribeAdmin((n) => {
      setNotifs((prev) => [n, ...prev].slice(0, 20))
      toast.success(n.title || 'New notification', { description: n.message })
    })
    return unsub
  }, [])

  const unread = notifs.filter((n) => !n.is_read).length

  return (
    <div className="min-h-screen bg-warm flex">
      {/* Sidebar */}
      <aside className={cn('fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-100 z-50 transition-transform lg:translate-x-0', sidebar ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <Link to="/admin"><img src="/logo-full.png" alt="MY HARDWARES" className="h-8" /></Link>
          <button onClick={() => setSidebar(false)} className="lg:hidden p-1"><X className="w-5 h-5" /></button>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-140px)]">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setSidebar(false)} className={({ isActive }) => cn('flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors', isActive ? 'bg-brand text-white' : 'text-ink-muted hover:bg-warm hover:text-ink')} data-testid={`admin-nav-${n.label.toLowerCase()}`}>
              <n.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-3 border-t border-gray-100">
          <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-ink-muted hover:bg-warm"><ExternalLink className="w-4 h-4" /> View Store</Link>
        </div>
      </aside>

      {sidebar && <div className="fixed inset-0 bg-ink/40 z-40 lg:hidden" onClick={() => setSidebar(false)} />}

      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100">
          <div className="flex items-center justify-between px-4 md:px-6 py-3.5">
            <button onClick={() => setSidebar(true)} className="lg:hidden p-2"><Menu className="w-6 h-6" /></button>
            <h1 className="font-heading font-semibold text-lg hidden md:block">Admin Panel</h1>
            <div className="flex items-center gap-3 ml-auto">
              <div className="relative">
                <button onClick={() => setBellOpen((v) => !v)} className="relative p-2.5 rounded-full hover:bg-warm" data-testid="admin-notifications">
                  <Bell className="w-5 h-5 text-ink" />
                  {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>}
                </button>
                <AnimatePresence>
                  {bellOpen && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-dropdown border border-gray-100 p-2 max-h-96 overflow-y-auto z-50">
                      <p className="px-3 py-2 font-semibold text-sm">Notifications</p>
                      {notifs.length === 0 ? <p className="px-3 py-6 text-sm text-ink-muted text-center">No notifications yet</p> : notifs.map((n) => (
                        <div key={n.id} className="px-3 py-2.5 rounded-xl hover:bg-warm"><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-ink-muted">{n.message}</p><p className="text-[10px] text-ink-muted mt-0.5">{formatDateTime(n.created_at)}</p></div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2 pl-3 border-l border-line">
                <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center text-brand font-bold text-sm">{user?.full_name?.[0]?.toUpperCase() || 'A'}</div>
                <div className="hidden md:block"><p className="text-sm font-semibold leading-tight">{user?.full_name}</p><p className="text-xs text-ink-muted">Admin</p></div>
                <button onClick={() => { logout(); navigate('/admin/login') }} className="p-2 rounded-full hover:bg-warm text-red-500 ml-1" data-testid="admin-logout"><LogOut className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /></button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <ErrorBoundary sectionName="Admin Page">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
