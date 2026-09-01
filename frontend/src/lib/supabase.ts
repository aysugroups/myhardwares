import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// True only when real credentials are present (not the placeholder defaults).
export const isSupabaseConfigured =
  !!url &&
  !!anonKey &&
  !url.includes('YOUR-PROJECT') &&
  !anonKey.includes('your-anon')

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
