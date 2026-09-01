import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, Heart, MapPin, User, LogOut } from 'lucide-react'
import { Seo } from '@/components/common/Seo'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/account', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/account/orders', label: 'My Orders', icon: ShoppingBag },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/profile', label: 'Profile', icon: User },
]

export function AccountLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  return (
    <div className="container-x py-8 md:py-12">
      <Seo title="My Account" />
      <div className="grid lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <div className="card p-5 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center text-brand font-heading font-bold text-xl">{user?.full_name?.[0]?.toUpperCase() || 'U'}</div>
            <p className="font-heading font-semibold mt-3 line-clamp-1">{user?.full_name}</p>
            <p className="text-sm text-ink-muted line-clamp-1">{user?.email}</p>
          </div>
          <nav className="card p-2">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn('flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors', isActive ? 'bg-brand text-white' : 'text-ink-muted hover:bg-warm hover:text-ink')} data-testid={`acct-nav-${l.label.toLowerCase().replace(' ', '-')}`}>
                <l.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> {l.label}
              </NavLink>
            ))}
            <button onClick={() => { logout(); navigate('/') }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50" data-testid="acct-logout"><LogOut className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> Logout</button>
          </nav>
        </aside>
        <div className="lg:col-span-3"><Outlet /></div>
      </div>
    </div>
  )
}
