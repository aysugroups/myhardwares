import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// All money math happens server-side in the Edge Function. Frontend only sends
// cart line references + address + coupon code; never trusts client totals.
export interface CheckoutItem {
  product_id: string
  quantity: number
}

export const paymentService = {
  get keyId() {
    return import.meta.env.VITE_RAZORPAY_KEY_ID as string
  },
  get isRazorpayConfigured() {
    return !!import.meta.env.VITE_RAZORPAY_KEY_ID
  },

  // Creates a server-validated Razorpay order (amount computed server-side).
  async createOrder(params: {
    items: CheckoutItem[]
    address: any
    coupon_code?: string | null
  }) {
    if (!isSupabaseConfigured) throw new Error('Store not configured')
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', { body: params })
    if (error) throw new Error(error.message || 'Could not start payment')
    if (data?.error) throw new Error(data.error)
    return data as {
      order_id: string
      razorpay_order_id: string
      amount: number
      currency: string
      key_id: string
      breakdown: { subtotal: number; discount: number; shipping: number; tax: number; total: number }
    }
  },

  // Verifies signature server-side, confirms order, reduces inventory atomically.
  async verify(params: {
    order_id: string
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) {
    const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', { body: params })
    if (error) throw new Error(error.message || 'Payment verification failed')
    if (data?.error) throw new Error(data.error)
    return data as { success: boolean; order_number: string; order_id: string }
  },

  async markFailed(orderId: string) {
    if (!isSupabaseConfigured) return
    await supabase.functions.invoke('mark-payment-failed', { body: { order_id: orderId } }).catch(() => {})
  },
}
