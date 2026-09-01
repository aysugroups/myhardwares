import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Plus, Star, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { addressService } from '@/services/addressService'
import { AddressForm } from '@/components/account/AddressForm'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

export default function Addresses() {
  const user = useAuthStore((s) => s.user)
  const { data: addresses = [], refetch } = useQuery({ queryKey: ['addresses', user?.id], queryFn: () => addressService.list(user!.id), enabled: !!user })
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const del = async (id: string) => { if (!confirm('Delete this address?')) return; await addressService.remove(id); toast.success('Address deleted'); refetch() }
  const makeDefault = async (a: any) => { await addressService.update(user!.id, a.id, { ...a, is_default: true }); refetch() }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">Addresses</h1>
        <Button onClick={() => { setAdding(true); setEditing(null) }} data-testid="add-new-address"><Plus className="w-4 h-4" /> Add Address</Button>
      </div>

      {(adding || editing) && (
        <div className="card p-6 mb-6">
          <h3 className="font-heading font-semibold mb-4">{editing ? 'Edit Address' : 'New Address'}</h3>
          <AddressForm userId={user!.id} initial={editing} onDone={() => { setAdding(false); setEditing(null); refetch() }} onCancel={() => { setAdding(false); setEditing(null) }} />
        </div>
      )}

      {addresses.length === 0 && !adding ? (
        <EmptyState icon={MapPin} title="No addresses saved" description="Add a delivery address for faster checkout." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a: any) => (
            <div key={a.id} className="card p-5" data-testid={`address-card-${a.id}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="chip bg-brand-light text-brand capitalize">{a.type}</span>
                {a.is_default && <span className="chip bg-green-100 text-green-700"><Star className="w-3 h-3 fill-green-700" /> Default</span>}
              </div>
              <p className="font-semibold text-ink">{a.full_name}</p>
              <p className="text-sm text-ink-muted mt-1">{a.line1}, {a.line2 && `${a.line2}, `}{a.city}, {a.state} — {a.pincode}</p>
              <p className="text-sm text-ink-muted">{a.phone}</p>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setAdding(false) }}><Pencil className="w-4 h-4" /> Edit</Button>
                {!a.is_default && <Button size="sm" variant="ghost" onClick={() => makeDefault(a)}>Set default</Button>}
                <Button size="sm" variant="ghost" onClick={() => del(a.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
