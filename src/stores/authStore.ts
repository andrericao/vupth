import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/authService';
import { pushService } from '../services/pushService';
import { registerAuthStore } from '../services/api';
import { useQueueStore } from './queueStore';

interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  profile_image_url?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateUser: (partial: Partial<AuthUser>) => Promise<void>;
  updateTokensAndUser: (tokens: { access_token: string; refresh_token: string }, user: Partial<AuthUser>) => Promise<void>;
}

const TOKEN_KEY = 'vupth_access_token';
const REFRESH_KEY = 'vupth_refresh_token';
const USER_KEY = 'vupth_user';
// Expo Push Token registrado (gravado pelo usePushRegistration nativo); o logout
// desregistra no backend. Só existe após um build COM o módulo nativo de push.
const PUSH_TOKEN_KEY = 'vupth_push_token';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await authService.login({ email, password });

    await SecureStore.setItemAsync(TOKEN_KEY, data.tokens.access_token);
    await SecureStore.setItemAsync(REFRESH_KEY, data.tokens.refresh_token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));

    set({
      user: data.user,
      accessToken: data.tokens.access_token,
      refreshToken: data.tokens.refresh_token,
      isAuthenticated: true,
    });
  },

  register: async (email, password) => {
    await authService.register({ email, password });
  },

  logout: async () => {
    const { accessToken } = get();
    if (accessToken) {
      // Desregistra o push token deste device (best-effort; no-op se não houver
      // token — só existe após build com o módulo nativo de push).
      try {
        const pushToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
        if (pushToken) {
          await pushService.unregisterDevice(pushToken, accessToken);
          await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
        }
      } catch {}

      try {
        await authService.logout(accessToken);
      } catch {}
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await useQueueStore.getState().leaveQueue();

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  refreshTokens: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return;

    const { data } = await authService.refresh(refreshToken);

    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    await SecureStore.setItemAsync(REFRESH_KEY, data.refresh_token);

    set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });
  },

  updateUser: async (partial) => {
    const { user } = get();
    if (!user) return;
    const updated = { ...user, ...partial };
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
    set({ user: updated });
  },

  updateTokensAndUser: async (tokens, userPartial) => {
    const { user } = get();
    if (!user) return;
    const updated = { ...user, ...userPartial };
    await SecureStore.setItemAsync(TOKEN_KEY, tokens.access_token);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
    set({
      user: updated,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
  },

  restoreSession: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);

      if (accessToken && refreshToken && userJson) {
        set({
          user: JSON.parse(userJson),
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

registerAuthStore((state) => useAuthStore.setState(state));
