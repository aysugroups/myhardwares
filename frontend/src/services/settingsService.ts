import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const DEFAULTS = {
  store_name: 'MY HARDWARES',
  phone: '+91 70105 86606',
  whatsapp_number: '917010586606',
  upi_id: '',
  upi_qr_url: '',
  email: 'support@myhardwares.com',
  address: 'India',
  announcement: 'Fast Delivery • Best Hardware Deals • Quality You Can Trust',
  free_shipping_threshold: 999,
  shipping_fee: 79,
  tax_percent: 0,
  currency: 'INR',
  social: { instagram: '', facebook: '', twitter: '', youtube: '' },
  delivery_estimate: '3-5 business days',
}

export type SiteSettings = typeof DEFAULTS

export const settingsService = {
  async get(): Promise<SiteSettings> {
    if (!isSupabaseConfigured) return DEFAULTS
    const { data } = await supabase.from('site_settings').select('data').eq('id', 1).maybeSingle()
    return { ...DEFAULTS, ...(data?.data || {}) }
  },
  async update(data: Partial<SiteSettings>) {
    const merged = { ...(await this.get()), ...data }
    const { error } = await supabase.from('site_settings').upsert({ id: 1, data: merged })
    if (error) throw error
    return merged
  },
}
