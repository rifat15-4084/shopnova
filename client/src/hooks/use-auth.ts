import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, plainApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import type { LoginInput, RegisterInput, User } from '@/types';
import { useCallback } from 'react';

export function useAuth() {
  const { user, accessToken, hydrated, setSession, setUser, logout } = useAuthStore();

  // Fetch the current user once we have a token (e.g. after a page reload).
  const meQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const { data } = await api.get<{ user: User }>('/auth/me');
      return data.user;
    },
    enabled: Boolean(accessToken) && hydrated,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const currentUser = meQuery.data ?? (meQuery.isError ? null : user);
  const queryClient = useQueryClient();
  const clearGuestCart = useCartStore((s) => s.clear);

  /** Merge the guest cart into the server cart right after sign-in. */
  const mergeGuestCart = useCallback(async () => {
    const items = useCartStore.getState().items;
    if (items.length === 0) return;
    try {
      await api.post('/auth/merge-cart', {
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId ?? null,
          qty: i.qty,
        })),
      });
      clearGuestCart();
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch {
      // non-fatal — the guest cart stays local
    }
  }, [clearGuestCart, queryClient]);

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await plainApi.post<{ user: User; accessToken: string }>('/auth/login', input);
      return data;
    },
    onSuccess: async (data) => {
      setSession(data.user, data.accessToken);
      queryClient.setQueryData(queryKeys.auth.me, data.user);
      await mergeGuestCart();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await plainApi.post<{ user: User; accessToken: string }>('/auth/register', input);
      return data;
    },
    onSuccess: async (data) => {
      setSession(data.user, data.accessToken);
      queryClient.setQueryData(queryKeys.auth.me, data.user);
      await mergeGuestCart();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await plainApi.post('/auth/logout');
    },
    onSettled: () => {
      logout();
      queryClient.clear();
    },
  });

  const isInitializing = !hydrated || (Boolean(accessToken) && meQuery.isLoading);

  return {
    user: currentUser,
    accessToken,
    hydrated,
    isLoadingUser: meQuery.isLoading,
    isInitializing,
    isAuthenticated: Boolean(currentUser),
    isAdmin: currentUser?.role === 'admin',
    setUser,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}
