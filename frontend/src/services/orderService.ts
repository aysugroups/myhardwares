import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const ORDER_SELECT = `
  id, order_number, user_id, address, subtotal, discount, coupon_code,
  shipping, tax, total, razorpay_order_id, razorpay_payment_id,
  payment_method, payment_confirmation_requested,
  payment_status, status, tracking_number, notes, created_at, updated_at,
  items:order_items(id, product_id, product_name, sku, unit_price, quantity, line_total, image_url),
  history:order_status_history(id, status, note, created_at)
`

export const WHATSAPP_ORDER_PHONE = '917010586606'

export const orderService = {
  async myOrders(userId: string) {
    if (!isSupabaseConfigured || !userId) return []
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getById(id: string) {
    if (!isSupabaseConfigured) return null
    const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle()
    if (error) throw error
    if (data?.history) data.history.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return data
  },

  async getByNumber(orderNumber: string) {
    if (!isSupabaseConfigured) return null
    const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('order_number', orderNumber).maybeSingle()
    if (data?.history) data.history.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return data
  },

  // Creates a server-validated order directly in Supabase (authoritative pricing & calculations)
  async createManualOrder(params: {
    userId: string
    items: { product_id: string; quantity: number }[]
    address: any
    coupon_code?: string | null
  }) {
    if (!isSupabaseConfigured) throw new Error('Store database not configured')
    const { data, error } = await supabase.rpc('create_pending_order', {
      p_user_id: params.userId,
      p_items: params.items,
      p_address: params.address,
      p_coupon: params.coupon_code || null,
    })
    if (error) throw new Error(error.message || 'Could not create order')
    return data as {
      order_id: string
      order_number: string
      amount: number
      breakdown: { subtotal: number; discount: number; shipping: number; tax: number; total: number }
    }
  },

  // Submits customer "I Have Paid" notice (leaves payment status as pending until admin verifies)
  async requestPaymentConfirmation(orderId: string) {
    if (!isSupabaseConfigured) throw new Error('Store database not configured')
    const { data, error } = await supabase.rpc('request_payment_confirmation', { p_order_id: orderId })
    if (error) throw new Error(error.message || 'Could not submit payment confirmation')
    return data
  },

  // Formats WhatsApp URL with target 917010586606 and structured order breakdown
  generateWhatsAppOrderUrl(order: {
    order_number: string
    address?: any
    items?: any[]
    subtotal: number
    shipping: number
    discount?: number
    total: number
  }) {
    const addr = order.address || {}
    const customerName = addr.full_name || 'Valued Customer'
    const customerPhone = addr.phone || '—'
    const addressStr = [
      addr.line1,
      addr.line2,
      addr.city,
      addr.state ? `${addr.state} — ${addr.pincode || ''}` : addr.pincode,
    ]
      .filter(Boolean)
      .join(', ')

    const itemsStr = (order.items || [])
      .map((item) => {
        const name = item.product_name || item.product?.name || 'Hardware Item'
        const qty = item.quantity || 1
        const price = item.line_total ?? ((item.unit_price || item.product?.price || 0) * qty)
        return `${name} × ${qty} — ₹${price}`
      })
      .join('\n')

    const message = `MY HARDWARES — NEW ORDER

Order ID: ${order.order_number}

Customer:
Name: ${customerName}
Phone: ${customerPhone}

Products:
${itemsStr || 'Hardware Items'}

Subtotal: ₹${order.subtotal}
Shipping: ₹${order.shipping}
Discount: ₹${order.discount || 0}
Total: ₹${order.total}

Delivery Address:
${addressStr || 'Address provided on checkout'}

Payment Status:
PENDING

Order Status:
PENDING PAYMENT`

    return `https://wa.me/${WHATSAPP_ORDER_PHONE}?text=${encodeURIComponent(message)}`
  },
}
