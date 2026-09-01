import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { addressService } from '@/services/addressService'
import { isValidIndianPhone, isValidPincode } from '@/lib/utils'

export function AddressForm({ userId, initial, onDone, onCancel }: { userId: string; initial?: any; onDone: () => void; onCancel?: () => void }) {
  const [form, setForm] = useState({
    full_name: initial?.full_name || '', phone: initial?.phone || '', line1: initial?.line1 || '', line2: initial?.line2 || '',
    city: initial?.city || '', state: initial?.state || '', pincode: initial?.pincode || '', landmark: initial?.landmark || '',
    type: initial?.type || 'home', is_default: initial?.is_default || false,
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidIndianPhone(form.phone)) return toast.error('Enter a valid 10-digit Indian phone number')
    if (!isValidPincode(form.pincode)) return toast.error('Enter a valid 6-digit PIN code')
    setSaving(true)
    try {
      if (initial?.id) await addressService.update(userId, initial.id, form)
      else await addressService.create(userId, form)
      toast.success('Address saved')
      onDone()
    } catch (e: any) { toast.error(e.message || 'Could not save address') } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3" data-testid="address-form">
      <input required placeholder="Full name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className="input-field" data-testid="addr-name" />
      <input required placeholder="Phone (10 digits)" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input-field" data-testid="addr-phone" />
      <input required placeholder="Address line 1" value={form.line1} onChange={(e) => set('line1', e.target.value)} className="input-field sm:col-span-2" data-testid="addr-line1" />
      <input placeholder="Address line 2 (optional)" value={form.line2} onChange={(e) => set('line2', e.target.value)} className="input-field sm:col-span-2" />
      <input required placeholder="City" value={form.city} onChange={(e) => set('city', e.target.value)} className="input-field" data-testid="addr-city" />
      <input required placeholder="State" value={form.state} onChange={(e) => set('state', e.target.value)} className="input-field" data-testid="addr-state" />
      <input required placeholder="PIN code" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} className="input-field" data-testid="addr-pincode" />
      <input placeholder="Landmark (optional)" value={form.landmark} onChange={(e) => set('landmark', e.target.value)} className="input-field" />
      <div className="flex items-center gap-4 sm:col-span-2">
        <select value={form.type} onChange={(e) => set('type', e.target.value)} className="input-field w-auto">
          <option value="home">Home</option><option value="work">Work</option><option value="other">Other</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={(e) => set('is_default', e.target.checked)} className="accent-brand w-4 h-4" /> Set as default</label>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={saving} data-testid="save-address">Save Address</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}
