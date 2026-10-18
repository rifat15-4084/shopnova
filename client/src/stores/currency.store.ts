import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Currency = 'usd' | 'bdt';

interface CurrencyState {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  toggle: () => void;
}

/** Display currency toggle (BDT converted client-side from the USD base). */
export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: 'usd',
      setCurrency: (currency) => set({ currency }),
      toggle: () => set((s) => ({ currency: s.currency === 'usd' ? 'bdt' : 'usd' })),
    }),
    { name: 'shopnova-currency' }
  )
);
