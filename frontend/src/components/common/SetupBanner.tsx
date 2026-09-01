import { isSupabaseConfigured } from '@/lib/supabase'
import { AlertTriangle } from 'lucide-react'

// Honest setup state (per spec §66): no fake data — tell the operator to connect Supabase.
export function SetupBanner() {
  if (isSupabaseConfigured) return null
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800" data-testid="setup-banner">
      <div className="container-x py-2.5 flex items-center gap-3 text-sm">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          <strong>Setup pending:</strong> Connect your Supabase project (add <code>VITE_SUPABASE_URL</code> &amp;{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>) to load real products, run schema.sql, then restart.
        </span>
      </div>
    </div>
  )
}
