import { useCartStore } from '@/stores/cart.store';
import { api } from '@/lib/api';
import type { CartItem, CartSummary, CheckoutConfig, CouponResult, ServerCartItem } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

/**
 * Cart behaviour:
 *  - Guests: items live in localStorage (zustand persist).
 *  - Authenticated: the server cart is the source of truth; all mutations
 *    hit the API and totals are always recomputed server-side.
 */
export function useCart() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  /* ── Server cart (authenticated) ─────────────────────── */
  const serverQuery = useQuery({
    queryKey: ['cart', 'server'],
    queryFn: async () => {
      const { data } = await api.get<{ cart: CartSummary }>('/cart');
      return data.cart;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  const invalidateCart = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['cart'] });
    void queryClient.invalidateQueries({ queryKey: ['checkout'] });
  }, [queryClient]);

  const addItemMutation = useMutation({
    mutationFn: async (input: { productId: string; variantId?: string | null; qty: number }) => {
      const { data } = await api.post<{ cart: CartSummary }>('/cart/items', input);
      return data.cart;
    },
    onSettled: invalidateCart,
  });

  const updateItemMutation = useMutation({
    mutationFn: async (input: { productId: string; variantId?: string | null; qty: number }) => {
      const { data } = await api.patch<{ cart: CartSummary }>('/cart/items', input);
      return data.cart;
    },
    onSettled: invalidateCart,
  });

  const removeItemMutation = useMutation({
    mutationFn: async (input: { productId: string; variantId?: string | null }) => {
      const params = input.variantId ? `?variantId=${encodeURIComponent(input.variantId)}` : '';
      const { data } = await api.delete<{ cart: CartSummary }>(`/cart/items/${input.productId}${params}`);
      return data.cart;
    },
    onSettled: invalidateCart,
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await api.delete<{ cart: CartSummary }>('/cart');
    },
    onSettled: invalidateCart,
  });

  const setCodeMutation = useMutation({
    mutationFn: async (code: string | null) => {
      const { data } = await api.post<{ cart: CartSummary }>('/cart/coupon', { code });
      return data.cart;
    },
    onSettled: invalidateCart,
  });

  /* ── Guest cart (localStorage) ───────────────────────── */
  const guestItems = useCartStore((s) => s.items);
  const guestAdd = useCartStore((s) => s.addItem);
  const guestUpdate = useCartStore((s) => s.updateQuantity);
  const guestRemove = useCartStore((s) => s.removeItem);
  const guestClear = useCartStore((s) => s.clear);

  /* ── Unified API ─────────────────────────────────────── */
  const items: ServerCartItem[] = isAuthenticated
    ? serverQuery.data?.items ?? []
    : guestItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId ?? null,
        variantLabel: '',
        title: i.title,
        slug: i.slug,
        image: i.image,
        sku: '',
        qty: i.qty,
        unitPrice: i.unitPrice,
        lineTotal: Math.round(i.unitPrice * i.qty * 100) / 100,
        availableStock: i.availableStock,
      }));

  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = Math.round(items.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;

  const addItem = useCallback(
    (item: CartItem) => {
      if (isAuthenticated) {
        addItemMutation.mutate({
          productId: item.productId,
          variantId: item.variantId ?? null,
          qty: item.qty,
        });
      } else {
        guestAdd(item);
      }
    },
    [isAuthenticated, addItemMutation, guestAdd]
  );

  const updateQuantity = useCallback(
    (productId: string, variantId: string | null, qty: number) => {
      if (isAuthenticated) {
        updateItemMutation.mutate({ productId, variantId, qty });
      } else {
        guestUpdate(productId, variantId, qty);
      }
    },
    [isAuthenticated, updateItemMutation, guestUpdate]
  );

  const removeItem = useCallback(
    (productId: string, variantId?: string | null) => {
      if (isAuthenticated) {
        removeItemMutation.mutate({ productId, variantId: variantId ?? null });
      } else {
        guestRemove(productId, variantId ?? null);
      }
    },
    [isAuthenticated, removeItemMutation, guestRemove]
  );

  const clear = useCallback(() => {
    if (isAuthenticated) clearMutation.mutate();
    else guestClear();
  }, [isAuthenticated, clearMutation, guestClear]);

  const setCoupon = useCallback(
    (code: string | null) => {
      if (isAuthenticated) setCodeMutation.mutate(code);
    },
    [isAuthenticated, setCodeMutation]
  );

  const couponCode = isAuthenticated ? serverQuery.data?.couponCode ?? null : null;

  return {
    items,
    itemCount,
    subtotal,
    couponCode,
    isLoading: isAuthenticated && serverQuery.isLoading,
    addItem,
    updateQuantity,
    removeItem,
    clear,
    setCoupon,
    validateCoupon: setCodeMutation,
    isAuthenticated,
  };
}

/** Server-computed totals (auth required). The client never trusts its own math. */
export function useCheckoutPreview(couponCode?: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['checkout', 'preview', couponCode ?? ''],
    queryFn: async () => {
      const { data } = await api.get<{ preview: import('@/types').CheckoutPreview }>('/checkout/preview', {
        params: couponCode ? { couponCode } : {},
      });
      return data.preview;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

/** Public checkout configuration (shipping threshold, tax rate, methods). */
export function useCheckoutConfig() {
  return useQuery({
    queryKey: ['checkout', 'config'],
    queryFn: async () => {
      const { data } = await api.get<CheckoutConfig>('/checkout/config');
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Validate a coupon code (auth required — the server throws on invalid codes). */
export function useValidateCoupon() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.get<{ coupon: CouponResult }>('/checkout/coupon', {
        params: { code },
      });
      return data.coupon;
    },
  });
}
