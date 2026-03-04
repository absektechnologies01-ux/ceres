import api from './axios';
import type { TokenResponse } from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const form = new FormData();
    form.append('username', email);
    form.append('password', password);
    const { data } = await api.post<TokenResponse>('/auth/login', form);
    return data;
  },

  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const { data } = await api.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },
};
