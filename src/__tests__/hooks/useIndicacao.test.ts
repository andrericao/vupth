import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { useIndicacao } from '@hooks/useIndicacao';
import { useAuthStore } from '@stores/authStore';

// entrada-por-link (CLI-34, Backend 3fdcec1): quem abre /i/<código> fica ligado
// a quem gerou o link — o app guarda o código e, logado, manda o claim.

jest.mock('expo-secure-store');
const mockClaim = jest.fn();
jest.mock('@services/referralService', () => ({
  referralService: { claim: (...a: unknown[]) => mockClaim(...a) },
}));

const guardado: Record<string, string> = {};
const get = SecureStore.getItemAsync as jest.Mock;
const set = SecureStore.setItemAsync as jest.Mock;
const del = SecureStore.deleteItemAsync as jest.Mock;
const KEY = 'vupth_indicacao';

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(guardado).forEach((k) => delete guardado[k]);
  get.mockImplementation(async (k: string) => guardado[k] ?? null);
  set.mockImplementation(async (k: string, v: string) => {
    guardado[k] = v;
  });
  del.mockImplementation(async (k: string) => {
    delete guardado[k];
  });
  mockClaim.mockResolvedValue({ data: { code: 'K7M2QX', referred_at: 'x' } });
  useAuthStore.setState({ isAuthenticated: false, accessToken: null });
});

describe('useIndicacao', () => {
  it('visitante pelo link: guarda o código e só manda depois de entrar na conta', async () => {
    renderHook(() => useIndicacao(() => '/i/K7M2QX'));
    await waitFor(() => expect(guardado[KEY]).toBe('K7M2QX'));
    expect(mockClaim).not.toHaveBeenCalled();

    await act(async () => {
      useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
    });
    await waitFor(() => expect(mockClaim).toHaveBeenCalledWith('K7M2QX', 'tk', null));
    await waitFor(() => expect(guardado[KEY]).toBeUndefined());
  });

  it('já logado pelo link: manda o código novo, não um velho', async () => {
    guardado[KEY] = 'VELHO';
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
    renderHook(() => useIndicacao(() => '/i/NOVO1'));
    await waitFor(() => expect(mockClaim).toHaveBeenCalledWith('NOVO1', 'tk', null));
    expect(mockClaim).toHaveBeenCalledTimes(1);
  });

  it('link com ?c=: a campanha vai junto no claim e sai com o código', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
    renderHook(() => useIndicacao(() => '/i/K7M2QX?c=camp-1'));
    await waitFor(() => expect(mockClaim).toHaveBeenCalledWith('K7M2QX', 'tk', 'camp-1'));
    await waitFor(() => expect(guardado['vupth_indicacao_campanha']).toBeUndefined());
  });

  it('link de campanha encerrada: avisa Promoção encerrada e apaga o código (DEC-124)', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockClaim.mockRejectedValue({ response: { status: 409, data: { code: 'CAMPAIGN_ENDED' } } });
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
    renderHook(() => useIndicacao(() => '/i/K7M2QX?c=camp-1'));
    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Promoção encerrada', expect.any(String), expect.any(Array), expect.anything()));
    await waitFor(() => expect(guardado[KEY]).toBeUndefined());
    alerta.mockRestore();
  });

  it('sem link e sem código guardado: nada', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
    renderHook(() => useIndicacao(() => '/loja/e1'));
    await act(async () => {});
    expect(set).not.toHaveBeenCalled();
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('recusa definitiva (409 já indicado) apaga o código', async () => {
    mockClaim.mockRejectedValue({ response: { status: 409, data: { code: 'REFERRAL_ALREADY_SET' } } });
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
    renderHook(() => useIndicacao(() => '/i/K7M2QX'));
    await waitFor(() => expect(mockClaim).toHaveBeenCalled());
    await waitFor(() => expect(guardado[KEY]).toBeUndefined());
  });

  it('apagar o código falhando não quebra', async () => {
    del.mockRejectedValue(new Error('x'));
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
    renderHook(() => useIndicacao(() => '/i/K7M2QX'));
    await waitFor(() => expect(del).toHaveBeenCalled());
  });

  it('sem rede: o código fica para o próximo login', async () => {
    mockClaim.mockRejectedValue(new Error('Network Error'));
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
    renderHook(() => useIndicacao(() => '/i/K7M2QX'));
    await waitFor(() => expect(mockClaim).toHaveBeenCalled());
    await act(async () => {});
    expect(guardado[KEY]).toBe('K7M2QX');
  });

  it('o armazenamento falhando não quebra nada', async () => {
    set.mockRejectedValue(new Error('x'));
    get.mockRejectedValue(new Error('x'));
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
    renderHook(() => useIndicacao(() => '/i/K7M2QX'));
    await act(async () => {});
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('o caminho vem do navegador na web; no aparelho, não há', async () => {
    const antes = Platform.OS;
    try {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      (global as unknown as { window: { location: { pathname: string } } }).window.location = { pathname: '/i/WEB01' } as never;
      renderHook(() => useIndicacao());
      await waitFor(() => expect(guardado[KEY]).toBe('WEB01'));

      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
      delete guardado[KEY];
      renderHook(() => useIndicacao());
      await act(async () => {});
      expect(guardado[KEY]).toBeUndefined();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: antes, configurable: true });
    }
  });
});
