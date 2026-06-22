import { api } from './api';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  created_at: string;
  user_roles: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export const authService = {
  register(data: RegisterRequest) {
    return api.post<RegisterResponse>('/auth/register', data);
  },

  login(data: LoginRequest) {
    return api.post<LoginResponse>('/auth/login', data);
  },

  refresh(refreshToken: string) {
    return api.post<RefreshResponse>('/auth/refresh', { refresh_token: refreshToken });
  },

  logout(accessToken: string) {
    return api.post('/auth/logout', null, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
