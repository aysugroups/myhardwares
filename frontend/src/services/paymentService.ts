import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// All money math happens server-side in the Edge Function. Frontend only sends
// cart line references + address + coupon code; never trusts client totals.
export interface CheckoutItem {
  product_id: string
  quantity: number
}

export interface CreateRazorpayOrderResponse {
  order_id: string
  order_number: string
  razorpay_order_id: string
  amount: number
  currency: string
  key_id: string
  reused?: boolean
  breakdown: {
    subtotal: number
    discount: number
    shipping: number
    tax: number
    total: number
  }
}

export interface VerifyRazorpayPaymentResponse {
  success: boolean
  order_id: string
  order_number: string
  already_paid?: boolean
}

async function extractEdgeFunctionError(error: any, data: any, fallback: string): Promise<string> {
  if (data?.error && typeof data.error === 'string') {
    return data.error
  }
  if (error?.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.clone().json()
      if (body?.error && typeof body.error === 'string') {
        return body.error
      }
    } catch {
      // ignore JSON parse failure on error context
    }
  }
  if (error?.message && typeof error.message === 'string' && !error.message.includes('non-2xx')) {
    return error.message
  }
  return fallback
}

export const paymentService = {
  get keyId() {
    const raw = (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined)?.trim() || ''
    if (!raw || raw.includes('xxxx')) return ''
    return raw
  },

  get isRazorpayConfigured() {
    return Boolean(this.keyId || isSupabaseConfigured)
  },

  // Creates a server-validated Razorpay order (amount computed server-side).
  // Supports optional order_id to safely retry an existing unpaid order without duplicating it.
  async createCodOrder(params: {
    items: CheckoutItem[]
    address: any
    coupon_code?: string | null
  }): Promise<{ success: boolean; order_id: string; order_number: string; total: number | null }> {
    if (!isSupabaseConfigured) throw new Error('Store not configured')
    const { data, error } = await supabase.functions.invoke('create-cod-order', { body: params })
    if (error || data?.error || !data?.success || !data?.order_id) {
      throw new Error(await extractEdgeFunctionError(error, data, 'Could not place COD order'))
    }
    return data
  },

  // Creates a server-validated Razorpay order (amount computed server-side).
  async createOrder(params: {
    items?: CheckoutItem[]
    address?: any
    coupon_code?: string | null
    order_id?: string | null
  }): Promise<CreateRazorpayOrderResponse> {
    if (!isSupabaseConfigured) throw new Error('Store not configured')
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', { body: params })
    if (error || data?.error) {
      throw new Error(await extractEdgeFunctionError(error, data, 'Could not start payment'))
    }
    if (!data?.order_id || !data?.razorpay_order_id || !data?.key_id) {
      throw new Error('Invalid payment order response from server')
    }
    return data as CreateRazorpayOrderResponse
  },

  // Verifies signature + Razorpay payment status server-side, confirms order, reduces inventory atomically.
  async verify(params: {
    order_id: string
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }): Promise<VerifyRazorpayPaymentResponse> {
    if (!isSupabaseConfigured) throw new Error('Store not configured')
    const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', { body: params })
    if (error || data?.error || !data?.success) {
      throw new Error(await extractEdgeFunctionError(error, data, 'Payment verification failed'))
    }
    return data as VerifyRazorpayPaymentResponse
  },

  async markFailed(orderId: string) {
    if (!isSupabaseConfigured || !orderId) return
    await supabase.functions.invoke('mark-payment-failed', { body: { order_id: orderId } }).catch(() => {})
  },
}
