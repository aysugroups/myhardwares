import { create } from 'zustand'

interface UIState {
  cartOpen: boolean
  menuOpen: boolean
  searchOpen: boolean
  setCartOpen: (v: boolean) => void
  setMenuOpen: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  cartOpen: false,
  menuOpen: false,
  searchOpen: false,
  setCartOpen: (v) => set({ cartOpen: v }),
  setMenuOpen: (v) => set({ menuOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
}))
