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

  // Esqueci minha senha (backend 2026-07-22, fatia 1). Público; SEMPRE 200,
  // exista o e-mail ou não (anti-enumeração). Envia código de 6 dígitos por
  // e-mail (validade 15min, uso único, máx 5 tentativas).
  forgotPassword(email: string) {
    return api.post('/auth/forgot-password', { email });
  },

  // Confere o código e troca a senha (queima o código). Erros:
  // 400 RESET_CODE_INVALID (inexistente/errado/usado/esgotado/e-mail desconhecido),
  // 400 RESET_CODE_EXPIRED, 422 validação.
  resetPassword(email: string, code: string, newPassword: string) {
    return api.post('/auth/reset-password', { email, code, new_password: newPassword });
  },
};
