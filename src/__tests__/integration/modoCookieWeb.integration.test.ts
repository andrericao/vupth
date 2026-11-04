import * as SecureStore from 'expo-secure-store';

import { mock } from './setup';
import { api } from '../../services/api';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';

// token-web-httponly (DEC-179): com a chave ligada (web), a sessão vai no cookie HttpOnly.
let mockLigado = true;
jest.mock('../../services/modoCookieWeb', () => ({
  ...jest.requireActual('../../services/modoCookieWeb'),
  modoCookieWeb: () => mockLigado,
}));
jest.mock('../../services/prontidaoDoServidor', () => ({ esperarServidor: jest.fn().mockResolvedValue(undefined) }));
jest.mock('expo-secure-store');
const ss = SecureStore as jest.Mocked<typeof SecureStore>;

beforeEach(() => {
  mockLigado = true;
  jest.clearAllMocks();
  ss.getItemAsync.mockResolvedValue(null);
  ss.setItemAsync.mockResolvedValue(undefined);
  ss.deleteItemAsync.mockResolvedValue(undefined);
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: true });
});

const sampleUser = { id: 'u1', email: 'a@b.com', roles: ['CLIENT'] };

describe('modo cookie — os pedidos', () => {
  it('todo pedido vai com credentials e sem Authorization, mesmo com o token na mão', async () => {
    mock.onGet('/clients/me/absences').reply((config) => [200, { withCredentials: config.withCredentials, auth: config.headers?.Authorization ?? null }]);
    const { data } = await api.get('/clients/me/absences', { headers: { Authorization: 'Bearer sessao-por-cookie' } });
    expect(data).toEqual({ withCredentials: true, auth: null });
    expect(ss.getItemAsync).not.toHaveBeenCalled();
  });

  it('401: renova por POST /auth/web/refresh (204) e repete o pedido', async () => {
    let vezes = 0;
    mock.onGet('/clients/me/absences').reply(() => (vezes++ === 0 ? [401, {}] : [200, { ok: true }]));
    mock.onPost('/auth/web/refresh').reply(204);
    const { data } = await api.get('/clients/me/absences');
    expect(data).toEqual({ ok: true });
    expect(mock.history.post.map((p) => p.url)).toContain('/auth/web/refresh');
  });

  it('refresh com 401 (sessão vencida): o estado volta a deslogado', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'sessao-por-cookie', user: sampleUser });
    mock.onGet('/clients/me/absences').reply(401, {});
    mock.onPost('/auth/web/refresh').reply(401, {});
    await expect(api.get('/clients/me/absences')).rejects.toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('modo cookie — entrar, voltar e sair', () => {
  it('login pede o modo cookie; guarda só o user, nunca token', async () => {
    mock.onPost('/auth/login').reply((config) => [200, { user: sampleUser, modo: config.headers?.['X-Auth-Mode'] }]);
    await useAuthStore.getState().login('a@b.com', 'x');
    expect(mock.history.post[0].headers?.['X-Auth-Mode']).toBe('cookie');
    const st = useAuthStore.getState();
    expect(st.isAuthenticated).toBe(true);
    expect(st.user).toEqual(sampleUser);
    expect(ss.setItemAsync).toHaveBeenCalledTimes(1);
    expect(ss.setItemAsync).toHaveBeenCalledWith('vupth_user', JSON.stringify(sampleUser));
    expect(ss.deleteItemAsync).toHaveBeenCalledWith('vupth_access_token');
    expect(ss.deleteItemAsync).toHaveBeenCalledWith('vupth_refresh_token');
  });

  it('reabrir com o user salvo: há sessão; sem ele, não', async () => {
    ss.getItemAsync.mockImplementation(async (k: string) => (k === 'vupth_user' ? JSON.stringify(sampleUser) : null));
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, isLoading: false, user: sampleUser });
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: true });
    ss.getItemAsync.mockResolvedValue(null);
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, isLoading: false });
  });

  it('trocar e-mail ou senha: só o user muda (os cookies novos vêm na resposta)', async () => {
    useAuthStore.setState({ user: sampleUser, accessToken: 'sessao-por-cookie', isAuthenticated: true });
    await useAuthStore.getState().updateTokensAndUser({ access_token: 'n', refresh_token: 'n' }, { email: 'c@d.com' });
    expect(useAuthStore.getState().user?.email).toBe('c@d.com');
    expect(ss.setItemAsync).not.toHaveBeenCalledWith('vupth_access_token', expect.anything());
  });

  it('sair: POST /auth/web/logout', async () => {
    mock.onPost('/auth/web/logout').reply(204);
    await authService.logout('sessao-por-cookie');
    expect(mock.history.post.map((p) => p.url)).toEqual(['/auth/web/logout']);
  });

  it('chave desligada: o login de sempre, sem o cabeçalho do modo', async () => {
    mockLigado = false;
    mock.onPost('/auth/login').reply(200, { user: sampleUser, tokens: { access_token: 'a', refresh_token: 'r', expires_in: 1 } });
    await authService.login({ email: 'a@b.com', password: 'x' });
    expect(mock.history.post[0].headers?.['X-Auth-Mode']).toBeUndefined();
  });
});
