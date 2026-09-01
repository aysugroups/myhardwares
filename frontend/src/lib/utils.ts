import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatINR(amount: number | null | undefined): string {
  const n = Number(amount || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function discountPercent(price: number, sale?: number | null): number {
  if (!sale || sale >= price) return 0
  return Math.round(((price - sale) / price) * 100)
}

export function effectivePrice(product: { price: number; sale_price?: number | null }): number {
  return product.sale_price && product.sale_price < product.price
    ? product.sale_price
    : product.price
}

export function stockLabel(stock: number, threshold = 5): 'in' | 'low' | 'out' {
  if (stock <= 0) return 'out'
  if (stock <= threshold) return 'low'
  return 'in'
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const isValidIndianPhone = (p: string) => /^[6-9]\d{9}$/.test(p.replace(/\D/g, '').slice(-10))
export const isValidPincode = (p: string) => /^[1-9]\d{5}$/.test(p)

export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300) {
  let t: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}

export function friendlyError(err: any): string {
  if (!err) return 'Something went wrong. Please try again.'
  const msg = typeof err === 'string' ? err : err.message || ''
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.'
  if (msg.includes('already registered')) return 'This email is already registered.'
  if (msg.includes('Email not confirmed')) return 'Please confirm your email before logging in.'
  if (msg.toLowerCase().includes('network')) return 'Network error. Please check your connection.'
  return msg || 'Something went wrong. Please try again.'
}
