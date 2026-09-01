import { useState } from 'react'
import { Phone, Mail, MapPin, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Seo } from '@/components/common/Seo'
import { Button } from '@/components/ui/Button'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const submit = (e: React.FormEvent) => { e.preventDefault(); toast.success("Thanks! We'll get back to you soon."); setForm({ name: '', email: '', message: '' }) }
  return (
    <>
      <Seo title="Contact" />
      <div className="container-x py-8 md:py-12">
        <h1 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mb-2">Get in touch</h1>
        <p className="text-ink-muted mb-8">Questions about a product or order? We're here to help.</p>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            {[{ i: Phone, t: 'Phone', v: '+91 90000 00000' }, { i: Mail, t: 'Email', v: 'support@myhardwares.com' }, { i: MapPin, t: 'Address', v: 'India' }].map((c) => (
              <div key={c.t} className="card p-5 flex items-center gap-4"><div className="w-11 h-11 rounded-2xl bg-brand-light flex items-center justify-center"><c.i className="w-5 h-5 text-brand" /></div><div><p className="text-sm text-ink-muted">{c.t}</p><p className="font-semibold">{c.v}</p></div></div>
            ))}
          </div>
          <form onSubmit={submit} className="card p-6 lg:col-span-2 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <input required placeholder="Your name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field" data-testid="contact-name" />
              <input required type="email" placeholder="Your email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field" data-testid="contact-email" />
            </div>
            <textarea required placeholder="Your message" rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="input-field resize-none" data-testid="contact-message" />
            <Button type="submit" data-testid="contact-submit"><Send className="w-4 h-4" /> Send Message</Button>
          </form>
        </div>
      </div>
    </>
  )
}
