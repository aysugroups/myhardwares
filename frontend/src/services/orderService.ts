import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const ORDER_SELECT = `
  id, order_number, user_id, address, subtotal, discount, coupon_code,
  shipping, tax, total, razorpay_order_id, razorpay_payment_id,
  payment_status, status, tracking_number, created_at, updated_at,
  items:order_items(id, product_id, product_name, sku, unit_price, quantity, line_total, image_url),
  history:order_status_history(id, status, note, created_at)
`

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
}
