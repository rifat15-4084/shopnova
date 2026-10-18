import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import type { Product } from '@/types';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Wishlist:
 *  - Guests: ids in localStorage.
 *  - Authenticated: the server wishlist is the source of truth; guest ids are
 *    merged once after sign-in via the toggle endpoint.
 */
interface WishlistState {
  ids: string[];
  setIds: (ids: string[]) => void;
  toggleLocal: (id: string) => void;
  clearLocal: () => void;
}

const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      ids: [],
      setIds: (ids) => set({ ids }),
      toggleLocal: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
        })),
      clearLocal: () => set({ ids: [] }),
    }),
    { name: 'shopnova-wishlist', storage: createJSONStorage(() => localStorage) }
  )
);

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const { ids, setIds, toggleLocal, clearLocal } = useWishlistStore();
  const queryClient = useQueryClient();
  const merged = useRef(false);

  const { data: serverItems } = useQuery({
    queryKey: ['account', 'wishlist'],
    queryFn: async () => {
      const { data } = await api.get<{ items: Product[] }>('/account/wishlist');
      return data.items;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const serverIds = serverItems?.map((p) => p._id) ?? serverItems?.map((p) => p.id);

  // Merge local guest ids into the server list exactly once per session.
  useEffect(() => {
    if (!isAuthenticated || !serverIds || merged.current) return;
    merged.current = true;
    const localOnly = ids.filter((id) => !serverIds.includes(id));
    if (localOnly.length > 0) setIds([...serverIds, ...localOnly]);
    else setIds(serverIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, serverIds?.join(',')]);

  const toggleMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { data } = await api.post<{ wishlist: string[] }>(`/account/wishlist/${productId}/toggle`);
      return data.wishlist;
    },
    onSuccess: (wishlist) => {
      setIds(wishlist);
      void queryClient.invalidateQueries({ queryKey: ['account', 'wishlist'] });
    },
  });

  const toggle = useCallback(
    (id: string) => {
      if (isAuthenticated) toggleMutation.mutate(id);
      else toggleLocal(id);
    },
    [isAuthenticated, toggleMutation, toggleLocal]
  );

  const clear = useCallback(() => {
    if (!isAuthenticated) clearLocal();
  }, [isAuthenticated, clearLocal]);

  return {
    /** Signed-in users get full products from the server; guests get nothing extra. */
    products: serverItems ?? [],
    wishlist: new Set(ids),
    count: ids.length,
    toggle,
    clear,
  };
}
