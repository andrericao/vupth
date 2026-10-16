import type { AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { mock } from './setup';
import { api, registerAuthStore, renovarSessao } from '../../services/api';

jest.mock('expo-secure-store');
const ss = SecureStore as jest.Mocked<typeof SecureStore>;

const TOKEN_KEY = 'vupth_access_token';
const REFRESH_KEY = 'vupth_refresh_token';
const USER_KEY = 'vupth_user';
const PROTECTED = '/attendances/client/me'; // rota NÃO pública

// Lê o Authorization do config que o mock-adapter recebe (AxiosHeaders ou objeto).
function authOf(config: AxiosRequestConfig): string | undefined {
  const h = config.headers as unknown as Record<string, string> | undefined;
  return h?.Authorization ?? h?.authorization;
}

// getItemAsync padrão: token + refresh presentes (sobrescrever por teste quando preciso).
function withTokens(token: string | null, refresh: string | null) {
  ss.getItemAsync.mockImplementation(async (key: string) => {
    if (key === TOKEN_KEY) return token;
    if (key === REFRESH_KEY) return refresh;
    return null;
  });
}

describe('api — interceptors', () => {
  let setAuthState: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    setAuthState = jest.fn();
    registerAuthStore(setAuthState);
    ss.getItemAsync.mockResolvedValue(null);
    ss.setItemAsync.mockResolvedValue(undefined);
    ss.deleteItemAsync.mockResolvedValue(undefined);
  });

  describe('request interceptor', () => {
    it('anexa Bearer token em rota protegida', async () => {
      withTokens('tok-123', null);
      let received: string | undefined;
      mock.onGet(PROTECTED).reply((config) => {
        received = authOf(config);
        return [200, {}];
      });

      await api.get(PROTECTED);

      expect(received).toBe('Bearer tok-123');
      expect(ss.getItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
    });

    it('NÃO anexa token em rota pública (/establishment)', async () => {
      ss.getItemAsync.mockResolvedValue('tok-123');
      let received: string | undefined;
      mock.onGet('/establishment').reply((config) => {
        received = authOf(config);
        return [200, []];
      });

      await api.get('/establishment');

      expect(received).toBeUndefined();
    });

    it('não sobrescreve Authorization já informado', async () => {
      withTokens('tok-store', null);
      let received: string | undefined;
      mock.onGet(PROTECTED).reply((config) => {
        received = authOf(config);
        return [200, {}];
      });

      await api.get(PROTECTED, { headers: { Authorization: 'Bearer explicit' } });

      expect(received).toBe('Bearer explicit');
    });

    it('sem token no store, não anexa header', async () => {
      withTokens(null, null);
      let received: string | undefined;
      mock.onGet(PROTECTED).reply((config) => {
        received = authOf(config);
        return [200, {}];
      });

      await api.get(PROTECTED);

      expect(received).toBeUndefined();
    });
  });

  describe('response interceptor — 401 / refresh', () => {
    it('401 → refresh → retry com novo token → sucesso', async () => {
      withTokens('old-tok', 'refresh-1');
      let attempt = 0;
      const auths: (string | undefined)[] = [];
      mock.onGet(PROTECTED).reply((config) => {
        attempt++;
        auths.push(authOf(config));
        return attempt === 1 ? [401, {}] : [200, { ok: true }];
      });
      mock.onPost('/auth/refresh').reply(200, {
        access_token: 'new-tok',
        refresh_token: 'refresh-2',
        expires_in: 3600,
      });

      const res = await api.get(PROTECTED);

      expect(res.status).toBe(200);
      expect(res.data).toEqual({ ok: true });
      expect(auths[0]).toBe('Bearer old-tok');
      expect(auths[1]).toBe('Bearer new-tok');
      expect(ss.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'new-tok');
      expect(ss.setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'refresh-2');
      expect(setAuthState).toHaveBeenCalledWith({ accessToken: 'new-tok', refreshToken: 'refresh-2' });
    });

    it('sem refresh token → logout e rejeita', async () => {
      withTokens('old-tok', null); // REFRESH ausente
      mock.onGet(PROTECTED).reply(401);

      await expect(api.get(PROTECTED)).rejects.toBeDefined();

      expect(ss.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
      expect(ss.deleteItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
      expect(ss.deleteItemAsync).toHaveBeenCalledWith(USER_KEY);
      expect(setAuthState).toHaveBeenCalledWith({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    });

    it('refresh falhando (401) → logout e rejeita', async () => {
      withTokens('old-tok', 'refresh-1');
      mock.onGet(PROTECTED).reply(401);
      mock.onPost('/auth/refresh').reply(401);

      await expect(api.get(PROTECTED)).rejects.toBeDefined();

      expect(ss.deleteItemAsync).toHaveBeenCalledWith(USER_KEY);
      expect(setAuthState).toHaveBeenCalledWith(
        expect.objectContaining({ isAuthenticated: false }),
      );
    });

    it('401 em rota pública NÃO dispara refresh', async () => {
      ss.getItemAsync.mockResolvedValue('tok');
      mock.onGet('/establishment').reply(401);
      let refreshCalled = false;
      mock.onPost('/auth/refresh').reply(() => {
        refreshCalled = true;
        return [200, {}];
      });

      await expect(api.get('/establishment')).rejects.toBeDefined();
      expect(refreshCalled).toBe(false);
    });

    it('401 CURRENT_PASSWORD_INVALID passa direto (erro de campo, sem refresh/logout)', async () => {
      withTokens('tok', 'refresh-1');
      mock.onPatch('/profile/update-password/me').reply(401, { code: 'CURRENT_PASSWORD_INVALID' });
      let refreshCalled = false;
      mock.onPost('/auth/refresh').reply(() => {
        refreshCalled = true;
        return [200, {}];
      });

      await expect(api.patch('/profile/update-password/me', {})).rejects.toMatchObject({
        response: { status: 401, data: { code: 'CURRENT_PASSWORD_INVALID' } },
      });
      expect(refreshCalled).toBe(false);
      // Tokens intactos: não pode ter deslogado.
      expect(ss.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('erro não-401 passa direto (sem refresh)', async () => {
      withTokens('tok', 'refresh-1');
      mock.onGet(PROTECTED).reply(500);
      let refreshCalled = false;
      mock.onPost('/auth/refresh').reply(() => {
        refreshCalled = true;
        return [200, {}];
      });

      await expect(api.get(PROTECTED)).rejects.toBeDefined();
      expect(refreshCalled).toBe(false);
    });

    it('requests concorrentes: o 2º enfileira e ambos retomam após 1 único refresh', async () => {
      withTokens('old-tok', 'refresh-1');
      let getCalls = 0;
      mock.onGet(PROTECTED).reply(() => {
        getCalls++;
        // os 2 originais tomam 401; os retries (3º/4º) pegam 200
        return getCalls <= 2 ? [401, {}] : [200, { ok: getCalls }];
      });
      let refreshCalls = 0;
      mock.onPost('/auth/refresh').reply(
        () =>
          new Promise((resolve) => {
            refreshCalls++;
            setTimeout(
              () => resolve([200, { access_token: 'new-tok', refresh_token: 'refresh-2', expires_in: 3600 }]),
              20,
            );
          }),
      );

      const [r1, r2] = await Promise.all([api.get(PROTECTED), api.get(PROTECTED)]);

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(refreshCalls).toBe(1); // o 2º request não disparou outro refresh
    });

    it('concorrentes com refresh falhando: o enfileirado também rejeita', async () => {
      withTokens('old-tok', 'refresh-1');
      mock.onGet(PROTECTED).reply(401);
      mock.onPost('/auth/refresh').reply(
        () => new Promise((resolve) => setTimeout(() => resolve([401, {}]), 20)),
      );

      const results = await Promise.allSettled([api.get(PROTECTED), api.get(PROTECTED)]);

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('rejected');
      expect(ss.deleteItemAsync).toHaveBeenCalledWith(USER_KEY);
    });

    // um-refresh-por-vez (log [SLOW] de 15/10): o WebSocket (beforeConnect) e o
    // 401 do HTTP renovando juntos faziam DOIS POST /auth/refresh.
    it('o WebSocket e o 401 renovando juntos: um único refresh', async () => {
      withTokens('old-tok', 'refresh-1');
      let getCalls = 0;
      mock.onGet(PROTECTED).reply(() => {
        getCalls++;
        return getCalls === 1 ? [401, {}] : [200, { ok: true }];
      });
      let refreshCalls = 0;
      mock.onPost('/auth/refresh').reply(
        () =>
          new Promise((resolve) => {
            refreshCalls++;
            setTimeout(
              () => resolve([200, { access_token: 'new-tok', refresh_token: 'refresh-2', expires_in: 3600 }]),
              20,
            );
          }),
      );

      const [res, token] = await Promise.all([api.get(PROTECTED), renovarSessao()]);

      expect(res.status).toBe(200);
      expect(token).toBe('new-tok');
      expect(refreshCalls).toBe(1);
    });
  });
});
