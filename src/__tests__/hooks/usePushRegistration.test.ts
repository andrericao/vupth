import { renderHook, waitFor, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { usePushRegistration } from '@hooks/usePushRegistration';
import { useAuthStore } from '@stores/authStore';
import { useFirstRunStore } from '@stores/firstRunStore';
import { usePushDiagnosticsStore } from '@stores/pushDiagnosticsStore';
import { PUSH_PERGUNTADO_KEY } from '@hooks/ofertaDePush';

// cobertura-98 (08/10): o registro do push (POST /devices), os canais, o aviso
// com o app aberto e o toque na notificacao.

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));
const n = jest.requireMock('expo-notifications') as Record<string, jest.Mock>;
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: { eas: { projectId: 'proj' } } } }));
jest.mock('expo-secure-store');

const mockRegisterDevice = jest.fn();
jest.mock('@services/pushService', () => ({
  pushService: { registerDevice: (...a: unknown[]) => mockRegisterDevice(...a) },
}));
const mockOferecer = jest.fn();
jest.mock('@utils/vezAdiantada', () => ({ oferecerVezAdiantada: (...a: unknown[]) => mockOferecer(...a) }));
const mockNavigate = jest.fn();
jest.mock('@routes/navigationRef', () => ({
  navigateFromNotification: (...a: unknown[]) => mockNavigate(...a),
}));

const getItem = SecureStore.getItemAsync as jest.Mock;
const setItem = SecureStore.setItemAsync as jest.Mock;

let recebido: ((notif: unknown) => void) | undefined;
let tocou: ((resp: unknown) => void) | undefined;
const removerRecebido = jest.fn();
const removerToque = jest.fn();

function resposta(id: string, action = 'expo.modules.notifications.actions.DEFAULT', data: object = { type: 'ATTENDANCE_STARTED' }) {
  return { actionIdentifier: action, notification: { request: { identifier: id, content: { data } } } };
}

beforeEach(() => {
  jest.clearAllMocks();
  recebido = undefined;
  tocou = undefined;
  n.setNotificationChannelAsync.mockResolvedValue(undefined);
  n.setNotificationCategoryAsync.mockResolvedValue(undefined);
  n.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
  n.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
  n.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[x]' });
  n.addNotificationReceivedListener.mockImplementation((fn) => {
    recebido = fn;
    return { remove: removerRecebido };
  });
  n.addNotificationResponseReceivedListener.mockImplementation((fn) => {
    tocou = fn;
    return { remove: removerToque };
  });
  n.getLastNotificationResponseAsync.mockResolvedValue(null);
  n.dismissNotificationAsync.mockResolvedValue(undefined);
  getItem.mockResolvedValue(null);
  setItem.mockResolvedValue(undefined);
  mockRegisterDevice.mockResolvedValue(undefined);
  useFirstRunStore.setState({ pushAsked: true, pushOferta: false, restored: true });
  useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' } as never);
});

describe('usePushRegistration — registro', () => {
  it('com a permissão dada, pega o token, registra o aparelho e guarda o token', async () => {
    renderHook(() => usePushRegistration());
    await waitFor(() => expect(setItem).toHaveBeenCalledWith('vupth_push_token', 'ExponentPushToken[x]'));
    expect(mockRegisterDevice).toHaveBeenCalledWith('ExponentPushToken[x]', expect.any(String), 'tok');
    expect(usePushDiagnosticsStore.getState().envio).toBe('ok');
  });

  it('sem login, não tenta', async () => {
    useAuthStore.setState({ isAuthenticated: false, accessToken: null } as never);
    renderHook(() => usePushRegistration());
    await act(async () => {});
    expect(n.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('antes da tela 10, não abre a caixa do sistema (ligar-push-permission)', async () => {
    useFirstRunStore.setState({ pushAsked: false });
    n.getPermissionsAsync.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
    renderHook(() => usePushRegistration());
    await waitFor(() => expect(usePushDiagnosticsStore.getState().motivo).toBe('sem-permissao'));
    expect(n.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('depois do "Quero ser avisada", abre a caixa e marca como perguntado', async () => {
    n.getPermissionsAsync.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
    renderHook(() => usePushRegistration());
    await waitFor(() => expect(n.requestPermissionsAsync).toHaveBeenCalled());
    expect(setItem).toHaveBeenCalledWith(PUSH_PERGUNTADO_KEY, '1');
  });

  it('o backend recusando (4xx) fica no painel como falha', async () => {
    mockRegisterDevice.mockRejectedValue(Object.assign(new Error('400'), { response: { status: 400 } }));
    renderHook(() => usePushRegistration());
    await waitFor(() => expect(usePushDiagnosticsStore.getState().envio).toBe('falhou'));
    expect(setItem).not.toHaveBeenCalledWith('vupth_push_token', expect.anything());
  });

  it('rede caindo: tenta de novo e o painel mostra a tentativa', async () => {
    jest.useFakeTimers();
    try {
      mockRegisterDevice.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(undefined);
      renderHook(() => usePushRegistration());
      await waitFor(() => expect(usePushDiagnosticsStore.getState().envio).toBe('tentando'));
      await act(async () => {
        jest.advanceTimersByTime(3_000);
      });
      await waitFor(() => expect(usePushDiagnosticsStore.getState().envio).toBe('ok'));
    } finally {
      jest.useRealTimers();
    }
  });

  it('sair durante a espera cancela a tentativa seguinte', async () => {
    mockRegisterDevice.mockRejectedValue(new Error('Network Error'));
    const { unmount } = renderHook(() => usePushRegistration());
    await waitFor(() => expect(usePushDiagnosticsStore.getState().envio).toBe('tentando'));
    unmount();
    await act(async () => {});
    expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
  });

  it('o logout libera um novo registro', async () => {
    const { rerender } = renderHook(() => usePushRegistration());
    await waitFor(() => expect(mockRegisterDevice).toHaveBeenCalledTimes(1));
    act(() => useAuthStore.setState({ isAuthenticated: false, accessToken: null } as never));
    rerender({});
    act(() => useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok2' } as never));
    rerender({});
    await waitFor(() => expect(mockRegisterDevice).toHaveBeenCalledTimes(2));
  });
});

describe('usePushRegistration — canais e categoria', () => {
  it('no Android cria o canal default e o "alertas", os dois HIGH', async () => {
    const antes = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    try {
      renderHook(() => usePushRegistration());
      await act(async () => {});
      expect(n.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.objectContaining({ importance: 4 }));
      expect(n.setNotificationChannelAsync).toHaveBeenCalledWith('alertas', expect.objectContaining({ importance: 4 }));
    } finally {
      Object.defineProperty(Platform, 'OS', { value: antes, configurable: true });
    }
  });

  it('binário sem o módulo nativo: canal e categoria não derrubam o app', async () => {
    const antes = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    n.setNotificationChannelAsync.mockImplementation(() => {
      throw new Error('sem módulo');
    });
    n.setNotificationCategoryAsync.mockImplementation(() => {
      throw new Error('sem módulo');
    });
    n.addNotificationReceivedListener.mockImplementation(() => {
      throw new Error('sem módulo');
    });
    n.addNotificationResponseReceivedListener.mockImplementation(() => {
      throw new Error('sem módulo');
    });
    try {
      expect(() => renderHook(() => usePushRegistration())).not.toThrow();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: antes, configurable: true });
    }
  });

  it('a categoria CIENCIA tem o botão OK que não abre o app', async () => {
    renderHook(() => usePushRegistration());
    expect(n.setNotificationCategoryAsync).toHaveBeenCalledWith('CIENCIA', [
      expect.objectContaining({ identifier: 'OK', options: { opensAppToForeground: false } }),
    ]);
  });
});

describe('usePushRegistration — com o app aberto', () => {
  it('o push vira aviso com OK', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderHook(() => usePushRegistration());
    recebido?.({ request: { content: { title: 'Sua vez', body: 'Faltam 2', data: {} } } });
    expect(alerta).toHaveBeenCalledWith('Sua vez', 'Faltam 2', [{ text: 'OK' }]);
  });

  it('push sem texto não mostra nada', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderHook(() => usePushRegistration());
    recebido?.({ request: { content: { title: '', body: '', data: {} } } });
    expect(alerta).not.toHaveBeenCalled();
  });

  it('a vez adiantada vira a pergunta com "Topo"', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderHook(() => usePushRegistration());
    recebido?.({
      request: { content: { body: 'Quer ir?', data: { type: 'EARLIER_TURN_OFFERED', attendanceId: 'a1' } } },
    });
    expect(mockOferecer).toHaveBeenCalledWith('a1', 'Quer ir?');
    expect(alerta).not.toHaveBeenCalled();
  });

  it('a vez adiantada sem corpo manda texto vazio', () => {
    renderHook(() => usePushRegistration());
    recebido?.({ request: { content: { data: { type: 'EARLIER_TURN_OFFERED', attendanceId: 'a1' } } } });
    expect(mockOferecer).toHaveBeenCalledWith('a1', '');
  });

  it('desmontar tira os listeners', () => {
    const { unmount } = renderHook(() => usePushRegistration());
    unmount();
    expect(removerRecebido).toHaveBeenCalled();
    expect(removerToque).toHaveBeenCalled();
  });
});

describe('usePushRegistration — toque na notificação', () => {
  it('o toque navega pela rota do tipo', () => {
    renderHook(() => usePushRegistration());
    tocou?.(resposta('n1'));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('o mesmo toque pelos dois caminhos navega uma vez só', async () => {
    n.getLastNotificationResponseAsync.mockResolvedValue(resposta('n1'));
    renderHook(() => usePushRegistration());
    await act(async () => {});
    tocou?.(resposta('n1'));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('o OK só fecha a notificação', () => {
    renderHook(() => usePushRegistration());
    tocou?.(resposta('n2', 'OK'));
    expect(n.dismissNotificationAsync).toHaveBeenCalledWith('n2');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('o OK com falha ao fechar não quebra', async () => {
    n.dismissNotificationAsync.mockRejectedValue(new Error('x'));
    renderHook(() => usePushRegistration());
    tocou?.(resposta('n3', 'OK'));
    await act(async () => {});
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('sem a última resposta (erro), segue sem navegar', async () => {
    n.getLastNotificationResponseAsync.mockRejectedValue(new Error('x'));
    renderHook(() => usePushRegistration());
    await act(async () => {});
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
