import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Seo } from '@/components/common/Seo'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/authService'
import { friendlyError } from '@/lib/utils'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await authService.forgotPassword(email); setSent(true) } catch (e: any) { toast.error(friendlyError(e)) } finally { setLoading(false) }
  }
  return (
    <div className="container-x py-12 md:py-20">
      <Seo title="Forgot Password" />
      <div className="max-w-md mx-auto card p-8">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">Reset your password</h1>
        {sent ? (
          <p className="text-ink-muted mt-4">If an account exists for <strong>{email}</strong>, we've sent a reset link. Check your inbox.</p>
        ) : (
          <>
            <p className="text-ink-muted mt-1 mb-6">Enter your email and we'll send a reset link.</p>
            <form onSubmit={submit} className="space-y-4">
              <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-muted" style={{ width: 18, height: 18 }} /><input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-11" data-testid="forgot-email" /></div>
              <Button type="submit" loading={loading} fullWidth size="lg" data-testid="forgot-submit">Send Reset Link</Button>
            </form>
          </>
        )}
        <p className="text-center text-sm text-ink-muted mt-6"><Link to="/login" className="text-brand font-semibold">Back to login</Link></p>
      </div>
    </div>
  )
}
