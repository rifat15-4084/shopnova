import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAccessToken as setApiAccessToken } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  hydrated: boolean;
  setSession: (user: User, accessToken: string) => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

/**
 * Persists only the access token (the refresh token lives in an httpOnly
 * cookie). On rehydrate we push the token into the axios module so that
 * requests are authenticated immediately after a page reload.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      hydrated: false,
      setSession: (user, accessToken) => {
        setApiAccessToken(accessToken);
        set({ user, accessToken });
      },
      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => {
        setApiAccessToken(accessToken);
        set({ accessToken });
      },
      logout: () => {
        setApiAccessToken(null);
        set({ user: null, accessToken: null });
      },
    }),
    {
      name: 'shopnova-auth',
      partialize: (state) => ({ accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        setApiAccessToken(state?.accessToken ?? null);
        useAuthStore.setState({ hydrated: true });
      },
    }
  )
);
