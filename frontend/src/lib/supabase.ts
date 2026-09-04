import { createClient } from '@supabase/supabase-js'

const url = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || ''
const anonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || ''

// True only when real credentials are present (not the placeholder defaults).
export const isSupabaseConfigured =
  !!url &&
  !!anonKey &&
  !url.includes('your-project') &&
  !url.includes('YOUR-PROJECT') &&
  !url.includes('placeholder') &&
  !anonKey.includes('your-anon') &&
  !anonKey.includes('YOUR_PUBLIC_ANON_KEY') &&
  !anonKey.includes('placeholder')

export const supabase = createClient(
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? anonKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

export const SUPABASE_URL = url
