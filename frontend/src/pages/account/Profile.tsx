import { useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { Button } from '@/components/ui/Button'
import { isValidIndianPhone } from '@/lib/utils'

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const refresh = useAuthStore((s) => s.refreshProfile)
  const [form, setForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '' })
  const [saving, setSaving] = useState(false)
  const [pwd, setPwd] = useState('')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.phone && !isValidIndianPhone(form.phone)) return toast.error('Enter a valid phone number')
    setSaving(true)
    try { await authService.updateProfile(user!.id, form); await refresh(); toast.success('Profile updated') } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  const changePwd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd.length < 8) return toast.error('Password must be at least 8 characters')
    try { await authService.updatePassword(pwd); toast.success('Password updated'); setPwd('') } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6">Profile</h1>
      <div className="card p-6 mb-6">
        <form onSubmit={save} className="space-y-4 max-w-md">
          <div><label className="text-sm font-medium text-ink-muted">Full name</label><input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="input-field mt-1" data-testid="profile-name" /></div>
          <div><label className="text-sm font-medium text-ink-muted">Email</label><input value={user?.email} disabled className="input-field mt-1 opacity-60" /></div>
          <div><label className="text-sm font-medium text-ink-muted">Phone</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input-field mt-1" data-testid="profile-phone" /></div>
          <Button type="submit" loading={saving} data-testid="save-profile">Save Changes</Button>
        </form>
      </div>
      <div className="card p-6">
        <h2 className="font-heading font-semibold text-lg mb-4">Change Password</h2>
        <form onSubmit={changePwd} className="flex gap-2 max-w-md">
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="New password" className="input-field" data-testid="new-password" />
          <Button type="submit" variant="secondary">Update</Button>
        </form>
      </div>
    </div>
  )
}
