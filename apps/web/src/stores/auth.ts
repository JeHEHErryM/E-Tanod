import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@e-tanod/types';
import { api } from '@/services/api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setTokens(access, refresh) {
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
      },

      async login(username, password) {
        const { data } = await api.post('/auth/login', { username, password });
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          isAuthenticated: true,
        });
      },

      async fetchMe() {
        const { data } = await api.get('/auth/me');
        set({ user: data.user, isAuthenticated: true });
      },

      async logout() {
        try {
          await api.post('/auth/logout', { refreshToken: get().refreshToken });
        } catch {
          // ignore network errors on logout
        }
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
      },

      clear() {
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'e-tanod-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
