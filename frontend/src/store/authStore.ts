import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';
import type { UserRole } from '../types';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  refreshTokens: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      login: async (email, password) => {
        const form = new FormData();
        form.append('username', email);
        form.append('password', password);
        const { data } = await api.post('/auth/login', form);
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: { id: data.sub, name: data.name, role: data.role },
        });
      },

      refreshTokens: async () => {
        const { data } = await api.post('/auth/refresh', {
          refresh_token: get().refreshToken,
        });
        set({ accessToken: data.access_token });
      },

      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'ceres-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
