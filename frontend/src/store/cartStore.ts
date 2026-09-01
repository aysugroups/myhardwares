import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cartService } from '@/services/cartService'
import { effectivePrice } from '@/lib/utils'

export interface CartLine {
  product_id: string
  quantity: number
  product: {
    id: string
    name: string
    slug: string
    price: number
    sale_price?: number | null
    stock: number
    primary_image?: string | null
    brand?: { name: string } | null
  }
}

interface CartState {
  items: CartLine[]
  userId: string | null
  add: (product: CartLine['product'], qty?: number) => void
  setQty: (productId: string, qty: number) => void
  remove: (productId: string) => void
  clear: () => void
  count: () => number
  subtotal: () => number
  bindUser: (userId: string) => Promise<void>
  unbindUser: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      userId: null,

      add: (product, qty = 1) => {
        const items = [...get().items]
        const idx = items.findIndex((i) => i.product_id === product.id)
        if (idx >= 0) {
          const next = Math.min(items[idx].quantity + qty, product.stock)
          items[idx] = { ...items[idx], quantity: next, product }
        } else {
          items.push({ product_id: product.id, quantity: Math.min(qty, product.stock), product })
        }
        set({ items })
        const uid = get().userId
        if (uid) cartService.upsert(uid, product.id, items.find((i) => i.product_id === product.id)!.quantity).catch(() => {})
      },

      setQty: (productId, qty) => {
        const items = get()
          .items.map((i) =>
            i.product_id === productId ? { ...i, quantity: Math.max(1, Math.min(qty, i.product.stock)) } : i,
          )
        set({ items })
        const uid = get().userId
        if (uid) cartService.upsert(uid, productId, items.find((i) => i.product_id === productId)!.quantity).catch(() => {})
      },

      remove: (productId) => {
        set({ items: get().items.filter((i) => i.product_id !== productId) })
        const uid = get().userId
        if (uid) cartService.remove(uid, productId).catch(() => {})
      },

      clear: () => {
        const uid = get().userId
        set({ items: [] })
        if (uid) cartService.clear(uid).catch(() => {})
      },

      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + effectivePrice(i.product) * i.quantity, 0),

      bindUser: async (userId) => {
        set({ userId })
        // Merge: local guest items win on quantity max, then load server union.
        const guest = get().items
        const server = await cartService.list(userId)
        const map = new Map<string, CartLine>()
        for (const s of server) if (s.product) map.set(s.product_id, { product_id: s.product_id, quantity: s.quantity, product: s.product })
        for (const g of guest) {
          const existing = map.get(g.product_id)
          const qty = existing ? Math.max(existing.quantity, g.quantity) : g.quantity
          map.set(g.product_id, { ...g, quantity: Math.min(qty, g.product.stock) })
        }
        const merged = Array.from(map.values())
        set({ items: merged })
        // Persist merged to server.
        for (const m of merged) cartService.upsert(userId, m.product_id, m.quantity).catch(() => {})
      },

      unbindUser: () => set({ userId: null, items: [] }),
    }),
    { name: 'mh-cart', partialize: (s) => ({ items: s.items }) },
  ),
)
