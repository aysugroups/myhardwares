import { create } from 'zustand'
import { wishlistService } from '@/services/wishlistService'

interface WishlistState {
  ids: Set<string>
  items: any[]
  userId: string | null
  load: (userId: string) => Promise<void>
  toggle: (productId: string) => Promise<boolean>
  has: (productId: string) => boolean
  clear: () => void
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set(),
  items: [],
  userId: null,

  load: async (userId) => {
    set({ userId })
    const items = await wishlistService.list(userId)
    set({ items, ids: new Set(items.map((i: any) => i.product_id)) })
  },

  toggle: async (productId) => {
    const uid = get().userId
    if (!uid) return false
    const ids = new Set(get().ids)
    if (ids.has(productId)) {
      ids.delete(productId)
      set({ ids, items: get().items.filter((i) => i.product_id !== productId) })
      await wishlistService.remove(uid, productId)
      return false
    } else {
      ids.add(productId)
      set({ ids })
      await wishlistService.add(uid, productId)
      const items = await wishlistService.list(uid)
      set({ items, ids: new Set(items.map((i: any) => i.product_id)) })
      return true
    }
  },

  has: (productId) => get().ids.has(productId),
  clear: () => set({ ids: new Set(), items: [], userId: null }),
}))
