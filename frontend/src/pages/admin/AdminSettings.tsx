import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { settingsService } from '@/services/settingsService'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminSettings() {
  const { data, isLoading } = useQuery({ queryKey: ['settings-admin'], queryFn: () => settingsService.get() })
  const [form, setForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (data) setForm(data) }, [data])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const setSocial = (k: string, v: string) => setForm((f: any) => ({ ...f, social: { ...f.social, [k]: v } }))

  const save = async () => { setSaving(true); try { await settingsService.update(form); toast.success('Settings saved') } catch (e: any) { toast.error(e.message) } finally { setSaving(false) } }

  if (isLoading || !form) return <Skeleton className="h-96" />

  return (
    <div className="max-w-3xl">
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6">Store Settings</h1>
      <div className="card p-6 space-y-4 mb-6">
        <h3 className="font-heading font-semibold">Store Info</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <F label="Store Name"><input value={form.store_name} onChange={(e) => set('store_name', e.target.value)} className="input-field" data-testid="set-storename" /></F>
          <F label="Phone"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input-field" /></F>
          <F label="Email"><input value={form.email} onChange={(e) => set('email', e.target.value)} className="input-field" /></F>
          <F label="Currency"><input value={form.currency} onChange={(e) => set('currency', e.target.value)} className="input-field" /></F>
        </div>
        <F label="Address"><input value={form.address} onChange={(e) => set('address', e.target.value)} className="input-field" /></F>
        <F label="Announcement Bar"><input value={form.announcement} onChange={(e) => set('announcement', e.target.value)} className="input-field" /></F>
      </div>
      <div className="card p-6 space-y-4 mb-6">
        <h3 className="font-heading font-semibold">Shipping & Tax</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <F label="Shipping Fee (₹)"><input type="number" value={form.shipping_fee} onChange={(e) => set('shipping_fee', Number(e.target.value))} className="input-field" data-testid="set-shipping" /></F>
          <F label="Free Shipping Above (₹)"><input type="number" value={form.free_shipping_threshold} onChange={(e) => set('free_shipping_threshold', Number(e.target.value))} className="input-field" /></F>
          <F label="Tax (%)"><input type="number" value={form.tax_percent} onChange={(e) => set('tax_percent', Number(e.target.value))} className="input-field" /></F>
        </div>
        <F label="Delivery Estimate"><input value={form.delivery_estimate} onChange={(e) => set('delivery_estimate', e.target.value)} className="input-field" /></F>
      </div>
      <div className="card p-6 space-y-4 mb-6">
        <h3 className="font-heading font-semibold">Social Links</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {['instagram', 'facebook', 'twitter', 'youtube'].map((s) => (
            <F key={s} label={s[0].toUpperCase() + s.slice(1)}><input value={form.social?.[s] || ''} onChange={(e) => setSocial(s, e.target.value)} className="input-field" /></F>
          ))}
        </div>
      </div>
      <Button onClick={save} loading={saving} size="lg" data-testid="save-settings">Save Settings</Button>
    </div>
  )
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-sm font-medium text-ink-muted mb-1 block">{label}</label>{children}</div>
}
