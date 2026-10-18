import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface UIState {
  theme: Theme;
  cartOpen: boolean;
  menuOpen: boolean;
  searchOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setCartOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      cartOpen: false,
      menuOpen: false,
      searchOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setCartOpen: (cartOpen) => set({ cartOpen }),
      setMenuOpen: (menuOpen) => set({ menuOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
    }),
    {
      name: 'shopnova-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
