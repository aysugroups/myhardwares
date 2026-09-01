import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Seo } from '@/components/common/Seo'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/authService'
import { friendlyError } from '@/lib/utils'
import { isSupabaseConfigured } from '@/lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured) return toast.error('Store not connected yet. Add Supabase keys first.')
    setLoading(true)
    try {
      const { user } = await authService.login(email, password)
      const profile = user ? await authService.getProfile(user.id) : null
      toast.success('Welcome back!')
      navigate(profile?.role === 'admin' ? '/admin' : '/account')
    } catch (e: any) { toast.error(friendlyError(e)) } finally { setLoading(false) }
  }

  return (
    <div className="container-x py-12 md:py-20">
      <Seo title="Login" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto card p-8">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">Welcome back</h1>
        <p className="text-ink-muted mt-1 mb-6">Log in to your MY HARDWARES account.</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-muted" style={{ width: 18, height: 18 }} /><input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-11" data-testid="login-email" /></div>
          <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-muted" style={{ width: 18, height: 18 }} /><input type={show ? 'text' : 'password'} required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pl-11 pr-11" data-testid="login-password" /><button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted">{show ? <EyeOff className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> : <Eye className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />}</button></div>
          <div className="flex justify-end"><Link to="/forgot-password" className="text-sm text-brand font-semibold">Forgot password?</Link></div>
          <Button type="submit" loading={loading} fullWidth size="lg" data-testid="login-submit">Log In</Button>
        </form>
        <p className="text-center text-sm text-ink-muted mt-6">Don't have an account? <Link to="/register" className="text-brand font-semibold">Create one</Link></p>
      </motion.div>
    </div>
  )
}
