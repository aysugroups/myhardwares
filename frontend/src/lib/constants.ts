export const CATEGORY_FALLBACK = '/logo-icon.png'

export const ORDER_STATUSES = [
  'pending_payment',
  'payment_failed',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refund_initiated',
  'refunded',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pending Payment',
  payment_failed: 'Payment Failed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refund_initiated: 'Refund Initiated',
  refunded: 'Refunded',
}

// Customer-facing tracking timeline (happy path)
export const TRACKING_STEPS = [
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
] as const

export const STATUS_COLOR: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-700',
  payment_failed: 'bg-red-100 text-red-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  packed: 'bg-violet-100 text-violet-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  out_for_delivery: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-200 text-gray-600',
  refund_initiated: 'bg-amber-100 text-amber-700',
  refunded: 'bg-green-100 text-green-700',
}
