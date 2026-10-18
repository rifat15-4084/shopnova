import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem } from '@/types';

/**
 * Guest-side cart (localStorage). When a user signs in this is merged into
 * the server cart via POST /auth/merge-cart and then cleared.
 */
interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, variantId: string | null, qty: number) => void;
  removeItem: (productId: string, variantId?: string | null) => void;
  clear: () => void;
}

const MAX_QTY_PER_LINE = 99;

function lineKey(item: Pick<CartItem, 'productId' | 'variantId'>) {
  return `${item.productId}::${item.variantId ?? ''}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => lineKey(i) === lineKey(item));
          if (existing) {
            return {
              items: state.items.map((i) =>
                lineKey(i) === lineKey(item)
                  ? { ...i, qty: Math.min(MAX_QTY_PER_LINE, i.qty + item.qty) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, qty: Math.min(MAX_QTY_PER_LINE, item.qty) }] };
        }),
      updateQuantity: (productId, variantId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => !(i.productId === productId && (i.variantId ?? null) === variantId))
              : state.items.map((i) =>
                  i.productId === productId && (i.variantId ?? null) === variantId
                    ? { ...i, qty: Math.min(MAX_QTY_PER_LINE, qty) }
                    : i
                ),
        })),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => !(i.productId === productId && (i.variantId ?? null) === (variantId ?? null))),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'shopnova-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
