import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { authService, type AuthUser } from '@/services/authService'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  isAdmin: boolean
  init: () => Promise<() => void>
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
  setUser: (u: AuthUser | null) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  isAdmin: false,

  setUser: (u) => set({ user: u, isAdmin: u?.role === 'admin' }),

  init: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false })
      return () => {}
    }
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.user) {
      const profile = await authService.getProfile(session.user.id)
      set({ user: profile, isAdmin: profile?.role === 'admin' })
    }
    set({ loading: false })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await authService.getProfile(session.user.id)
        set({ user: profile, isAdmin: profile?.role === 'admin' })
      } else {
        set({ user: null, isAdmin: false })
      }
    })
    return () => subscription.unsubscribe()
  },

  refreshProfile: async () => {
    const u = get().user
    if (!u) return
    const profile = await authService.getProfile(u.id)
    set({ user: profile, isAdmin: profile?.role === 'admin' })
  },

  logout: async () => {
    await authService.logout()
    set({ user: null, isAdmin: false })
  },
}))
