import { useAuthStore } from '@stores/authStore';
import { authService } from '@services/authService';
import { api } from '@services/api';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');
jest.mock('@services/authService', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refresh: jest.fn(),
  },
}));

const ss = SecureStore as jest.Mocked<typeof SecureStore>;
const mockLogin = authService.login as jest.Mock;
const mockRegister = authService.register as jest.Mock;
const mockLogout = authService.logout as jest.Mock;

const TOKEN_KEY = 'vupth_access_token';
const REFRESH_KEY = 'vupth_refresh_token';
const USER_KEY = 'vupth_user';

const sampleUser = { id: 'u1', email: 'a@b.com', roles: ['CLIENT'] };

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ss.setItemAsync.mockResolvedValue(undefined);
    ss.deleteItemAsync.mockResolvedValue(undefined);
    ss.getItemAsync.mockResolvedValue(null);
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  it('login salva tokens+user, persiste e autentica', async () => {
    mockLogin.mockResolvedValueOnce({
      data: { user: sampleUser, tokens: { access_token: 'a', refresh_token: 'r' } },
    });

    await useAuthStore.getState().login('a@b.com', '123456');

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user).toEqual(sampleUser);
    expect(s.accessToken).toBe('a');
    expect(s.refreshToken).toBe('r');
    expect(ss.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'a');
    expect(ss.setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'r');
    expect(ss.setItemAsync).toHaveBeenCalledWith(USER_KEY, JSON.stringify(sampleUser));
  });

  it('register chama authService.register', async () => {
    mockRegister.mockResolvedValueOnce({});
    await useAuthStore.getState().register('a@b.com', '123456');
    expect(mockRegister).toHaveBeenCalledWith({ email: 'a@b.com', password: '123456' });
  });

  it('logout limpa storage e reseta o estado', async () => {
    useAuthStore.setState({ accessToken: 'a', user: sampleUser, isAuthenticated: true });
    mockLogout.mockResolvedValueOnce({});

    await useAuthStore.getState().logout();

    expect(mockLogout).toHaveBeenCalledWith('a');
    expect(ss.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
    expect(ss.deleteItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
    expect(ss.deleteItemAsync).toHaveBeenCalledWith(USER_KEY);
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(s.accessToken).toBeNull();
  });

  it('logout sem token não chama o endpoint mas reseta', async () => {
    useAuthStore.setState({ accessToken: null });
    await useAuthStore.getState().logout();
    expect(mockLogout).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('logout tolera falha do endpoint (segue limpando)', async () => {
    useAuthStore.setState({ accessToken: 'a', isAuthenticated: true });
    mockLogout.mockRejectedValueOnce(new Error('rede'));
    await useAuthStore.getState().logout();
    expect(ss.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('refreshTokens sem refresh token é no-op', async () => {
    useAuthStore.setState({ refreshToken: null });
    const post = jest.spyOn(api, 'post');
    await useAuthStore.getState().refreshTokens();
    expect(post).not.toHaveBeenCalled();
    post.mockRestore();
  });

  it('refreshTokens troca os tokens e persiste', async () => {
    useAuthStore.setState({ refreshToken: 'r0' });
    ss.getItemAsync.mockImplementation(async (k) => (k === REFRESH_KEY ? 'r0' : null));
    const post = jest.spyOn(api, 'post').mockResolvedValueOnce({ data: { access_token: 'a1', refresh_token: 'r1' } });

    await useAuthStore.getState().refreshTokens();

    expect(post).toHaveBeenCalledWith('/auth/refresh', { refresh_token: 'r0' });
    expect(useAuthStore.getState().accessToken).toBe('a1');
    expect(useAuthStore.getState().refreshToken).toBe('r1');
    expect(ss.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'a1');
    expect(ss.setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'r1');
    post.mockRestore();
  });

  // um-refresh-por-vez (log [SLOW] de 15/10): o refresh troca o refresh_token,
  // entao dois juntos queimavam um ao outro.
  it('dois refreshTokens juntos fazem UM POST /auth/refresh', async () => {
    useAuthStore.setState({ refreshToken: 'r0' });
    ss.getItemAsync.mockImplementation(async (k) => (k === REFRESH_KEY ? 'r0' : null));
    let soltar: (v: unknown) => void = () => {};
    const post = jest.spyOn(api, 'post').mockReturnValueOnce(new Promise((r) => (soltar = r)) as never);

    const um = useAuthStore.getState().refreshTokens();
    const dois = useAuthStore.getState().refreshTokens();
    await Promise.resolve();
    await Promise.resolve();
    soltar({ data: { access_token: 'a1', refresh_token: 'r1' } });
    await Promise.all([um, dois]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe('a1');
    post.mockRestore();
  });

  it('refresh falhando no refreshTokens rejeita, mas não derruba a sessão (quem decide é o interceptor)', async () => {
    useAuthStore.setState({ refreshToken: 'r0', accessToken: 'a0', isAuthenticated: true });
    ss.getItemAsync.mockImplementation(async (k) => (k === REFRESH_KEY ? 'r0' : null));
    const post = jest.spyOn(api, 'post').mockRejectedValueOnce(new Error('offline'));

    await expect(useAuthStore.getState().refreshTokens()).rejects.toThrow('offline');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    post.mockRestore();
  });

  it('updateUser mescla e persiste', async () => {
    useAuthStore.setState({ user: sampleUser });
    await useAuthStore.getState().updateUser({ first_name: 'Ana' });
    expect(useAuthStore.getState().user).toEqual({ ...sampleUser, first_name: 'Ana' });
    expect(ss.setItemAsync).toHaveBeenCalledWith(
      USER_KEY,
      JSON.stringify({ ...sampleUser, first_name: 'Ana' }),
    );
  });

  it('updateUser sem user é no-op', async () => {
    useAuthStore.setState({ user: null });
    await useAuthStore.getState().updateUser({ first_name: 'Ana' });
    expect(ss.setItemAsync).not.toHaveBeenCalled();
  });

  it('updateTokensAndUser atualiza tokens e mescla o user', async () => {
    useAuthStore.setState({ user: sampleUser });
    await useAuthStore
      .getState()
      .updateTokensAndUser({ access_token: 'a2', refresh_token: 'r2' }, { email: 'novo@b.com' });
    const s = useAuthStore.getState();
    expect(s.accessToken).toBe('a2');
    expect(s.refreshToken).toBe('r2');
    expect(s.user?.email).toBe('novo@b.com');
  });

  it('updateTokensAndUser sem user é no-op', async () => {
    useAuthStore.setState({ user: null });
    await useAuthStore
      .getState()
      .updateTokensAndUser({ access_token: 'a2', refresh_token: 'r2' }, { email: 'x@y.com' });
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('restoreSession com dados restaura a sessão', async () => {
    ss.getItemAsync.mockImplementation(async (key: string) => {
      if (key === TOKEN_KEY) return 'a';
      if (key === REFRESH_KEY) return 'r';
      if (key === USER_KEY) return JSON.stringify(sampleUser);
      return null;
    });

    await useAuthStore.getState().restoreSession();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user).toEqual(sampleUser);
    expect(s.isLoading).toBe(false);
  });

  it('restoreSession sem dados só desliga o loading', async () => {
    ss.getItemAsync.mockResolvedValue(null);
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('restoreSession com erro só desliga o loading', async () => {
    ss.getItemAsync.mockRejectedValueOnce(new Error('boom'));
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
