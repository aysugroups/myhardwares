import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Seo } from '@/components/common/Seo'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/authService'
import { friendlyError } from '@/lib/utils'
import { isSupabaseConfigured } from '@/lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured) return toast.error('Store not connected yet. Add Supabase keys first.')
    setLoading(true)
    try {
      const { user } = await authService.login(email, password)
      const profile = user ? await authService.getProfile(user.id) : null
      if (profile?.role !== 'admin') {
        await authService.logout()
        toast.error('This account does not have admin access.')
        return
      }
      toast.success('Welcome, admin')
      navigate('/admin')
    } catch (e: any) { toast.error(friendlyError(e)) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-warm flex items-center justify-center p-4">
      <Seo title="Admin Login" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block">
            <img src="/logo-full.png" alt="MY HARDWARES" className="h-16 w-auto max-w-[180px] mx-auto object-contain" />
          </Link>
        </div>
        <div className="card p-8">
          <div className="flex items-center gap-2 text-brand mb-1"><ShieldCheck className="w-5 h-5" /><span className="font-semibold text-sm uppercase tracking-wide">Admin Access</span></div>
          <h1 className="font-heading font-bold text-2xl tracking-tight mb-6">Sign in to dashboard</h1>
          <form onSubmit={submit} className="space-y-4">
            <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-muted" style={{ width: 18, height: 18 }} /><input type="email" required placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-11" data-testid="admin-email" /></div>
            <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-muted" style={{ width: 18, height: 18 }} /><input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pl-11" data-testid="admin-password" /></div>
            <Button type="submit" loading={loading} fullWidth size="lg" data-testid="admin-login-submit">Sign In</Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
