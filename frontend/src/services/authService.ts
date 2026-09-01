import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  phone?: string | null
  role: 'customer' | 'admin'
  status?: string
}

export const authService = {
  async getSession() {
    if (!isSupabaseConfigured) return null
    const { data } = await supabase.auth.getSession()
    return data.session
  },

  async getProfile(userId: string): Promise<AuthUser | null> {
    if (!isSupabaseConfigured) return null
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    return data as AuthUser | null
  },

  async register(email: string, password: string, fullName: string, phone?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone: phone || null } },
    })
    if (error) throw error
    return data
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async logout() {
    await supabase.auth.signOut()
  },

  async forgotPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },

  async updateProfile(userId: string, payload: Partial<AuthUser>) {
    const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select().single()
    if (error) throw error
    return data
  },
}
