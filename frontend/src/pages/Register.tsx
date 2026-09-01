import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { Seo } from '@/components/common/Seo'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/authService'
import { friendlyError, isValidIndianPhone } from '@/lib/utils'
import { isSupabaseConfigured } from '@/lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured) return toast.error('Store not connected yet. Add Supabase keys first.')
    if (form.phone && !isValidIndianPhone(form.phone)) return toast.error('Enter a valid 10-digit phone number')
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    try {
      await authService.register(form.email, form.password, form.full_name, form.phone)
      toast.success('Account created! You can now log in.')
      navigate('/login')
    } catch (e: any) { toast.error(friendlyError(e)) } finally { setLoading(false) }
  }

  return (
    <div className="container-x py-12 md:py-20">
      <Seo title="Create Account" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto card p-8">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">Create your account</h1>
        <p className="text-ink-muted mt-1 mb-6">Join MY HARDWARES for faster checkout & order tracking.</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-muted" style={{ width: 18, height: 18 }} /><input required placeholder="Full name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className="input-field pl-11" data-testid="reg-name" /></div>
          <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-muted" style={{ width: 18, height: 18 }} /><input type="email" required placeholder="Email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input-field pl-11" data-testid="reg-email" /></div>
          <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-muted" style={{ width: 18, height: 18 }} /><input placeholder="Phone (optional)" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input-field pl-11" data-testid="reg-phone" /></div>
          <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-muted" style={{ width: 18, height: 18 }} /><input type="password" required placeholder="Password (min 8 chars)" value={form.password} onChange={(e) => set('password', e.target.value)} className="input-field pl-11" data-testid="reg-password" /></div>
          <Button type="submit" loading={loading} fullWidth size="lg" data-testid="reg-submit">Create Account</Button>
        </form>
        <p className="text-center text-sm text-ink-muted mt-6">Already have an account? <Link to="/login" className="text-brand font-semibold">Log in</Link></p>
      </motion.div>
    </div>
  )
}
