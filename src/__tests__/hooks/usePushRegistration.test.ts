import { usePendenciaStore } from '@stores/pendenciaStore';
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
const mockResponder = jest.fn();
jest.mock('@utils/trocaPeloPush', () => ({
  responderPeloPush: (...a: unknown[]) => mockResponder(...a),
}));
const mockNavigate = jest.fn();
const mockAbrirAvaliacao = jest.fn();
const mockAbrirLoja = jest.fn();
jest.mock('@routes/navigationRef', () => ({
  navigateFromNotification: (...a: unknown[]) => mockNavigate(...a),
  abrirAvaliacao: (...a: unknown[]) => mockAbrirAvaliacao(...a),
  abrirLoja: (...a: unknown[]) => mockAbrirLoja(...a),
}));

// O handler do push em primeiro plano e registrado no import do modulo.
const handlerDoModulo = n.setNotificationHandler.mock.calls[0]?.[0] as { handleNotification: () => Promise<object> };
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

  it('depois do "Avisar", abre a caixa e marca como perguntado', async () => {
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

  it('as categorias que levam a uma tela têm um botão que abre o app', async () => {
    renderHook(() => usePushRegistration());
    expect(n.setNotificationCategoryAsync).toHaveBeenCalledWith('VER_FILA', [
      { identifier: 'VER_FILA', buttonTitle: 'Ver minha vez', options: { opensAppToForeground: true } },
    ]);
    expect(n.setNotificationCategoryAsync).toHaveBeenCalledWith('VER_ATENDIMENTO', [
      { identifier: 'VER_ATENDIMENTO', buttonTitle: 'Ver atendimento', options: { opensAppToForeground: true } },
    ]);
    expect(n.setNotificationCategoryAsync).toHaveBeenCalledWith('AVALIAR', [
      { identifier: 'AVALIAR', buttonTitle: 'Avaliar', options: { opensAppToForeground: true } },
    ]);
  });

  it('o push de concluído (corpo ou "Avaliar") abre a avaliação do atendimento', () => {
    renderHook(() => usePushRegistration());
    tocou?.(resposta('n8', 'AVALIAR', { type: 'ATTENDANCE_FINISHED', attendanceId: 'a1' }));
    tocou?.(resposta('n9', undefined, { type: 'ATTENDANCE_FINISHED', attendanceId: 'a2' }));
    expect(mockAbrirAvaliacao).toHaveBeenNthCalledWith(1, 'a1');
    expect(mockAbrirAvaliacao).toHaveBeenNthCalledWith(2, 'a2');
    expect(mockNavigate).not.toHaveBeenCalled();
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

  it('a categoria TROCA tem CONFIRMAR (abre o app) e AGORA NÃO (só fecha)', () => {
    renderHook(() => usePushRegistration());
    expect(n.setNotificationCategoryAsync).toHaveBeenCalledWith('TROCA', [
      { identifier: 'CONFIRMAR', buttonTitle: 'CONFIRMAR', options: { opensAppToForeground: true } },
      { identifier: 'AGORA_NAO', buttonTitle: 'AGORA NÃO', options: { opensAppToForeground: false } },
    ]);
  });

  it('CONFIRMAR da troca abre a fila e aceita', () => {
    renderHook(() => usePushRegistration());
    const data = { type: 'SWAP_OFFERED', offerId: 'o1' };
    tocou?.(resposta('n5', 'CONFIRMAR', data));
    expect(n.dismissNotificationAsync).toHaveBeenCalledWith('n5');
    expect(mockNavigate).toHaveBeenCalledWith('fila');
    expect(mockResponder).toHaveBeenCalledWith('n5', 'CONFIRMAR', data);
  });

  // push-acoes-por-pergunta (24/10, Backend 7584964): a pergunta da tela vira botão.
  it('as categorias das perguntas: Trocar/Recusar e Aceitar/Manter, nenhum abre o app (push-resolve-sem-abrir-o-app)', () => {
    renderHook(() => usePushRegistration());
    expect(n.setNotificationCategoryAsync).toHaveBeenCalledWith('TROCAR_RECUSAR', [
      { identifier: 'TROCAR', buttonTitle: 'Trocar', options: { opensAppToForeground: false } },
      { identifier: 'RECUSAR', buttonTitle: 'Recusar', options: { opensAppToForeground: false } },
    ]);
    expect(n.setNotificationCategoryAsync).toHaveBeenCalledWith('ACEITAR_MANTER', [
      { identifier: 'ACEITAR', buttonTitle: 'Aceitar', options: { opensAppToForeground: false } },
      { identifier: 'MANTER', buttonTitle: 'Manter', options: { opensAppToForeground: false } },
    ]);
  });

  it('Trocar e Aceitar respondem ali mesmo: aceitam sem navegar', () => {
    renderHook(() => usePushRegistration());
    const pedido = { type: 'SWAP_REQUESTED', swapRequestId: 'r1' };
    tocou?.(resposta('n10', 'TROCAR', pedido));
    expect(mockResponder).toHaveBeenCalledWith('n10', 'TROCAR', pedido);
    const adiantada = { type: 'EARLIER_TURN_OFFERED', attendanceId: 'a1' };
    tocou?.(resposta('n11', 'ACEITAR', adiantada));
    expect(mockResponder).toHaveBeenCalledWith('n11', 'ACEITAR', adiantada);
    expect(n.dismissNotificationAsync).toHaveBeenCalledWith('n10');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('Recusar nega o pedido de troca; Manter só fecha, sem chamar nada', () => {
    renderHook(() => usePushRegistration());
    const pedido = { type: 'SWAP_REQUESTED', swapRequestId: 'r1' };
    tocou?.(resposta('n12', 'RECUSAR', pedido));
    expect(mockResponder).toHaveBeenCalledWith('n12', 'RECUSAR', pedido);
    tocou?.(resposta('n13', 'MANTER', { type: 'EARLIER_TURN_OFFERED', attendanceId: 'a1' }));
    expect(n.dismissNotificationAsync).toHaveBeenCalledWith('n13');
    expect(mockResponder).toHaveBeenCalledTimes(1);
  });

  it('AGENDA_OPENED: o toque leva ao agendamento do profissional', () => {
    renderHook(() => usePushRegistration());
    tocou?.(resposta('n16', 'default', { type: 'AGENDA_OPENED', establishmentId: 'e1', professionalId: 'p1' }));
    expect(mockAbrirLoja).toHaveBeenCalledWith('e1', 'p1');
    expect(n.dismissNotificationAsync).toHaveBeenCalledWith('n16');
  });

  it('PAYMENT_PENDING e PAYMENT_REFUSED (categoria PAGAR) abrem o pagamento do atendimento', () => {
    renderHook(() => usePushRegistration());
    tocou?.(resposta('n14', 'PAGAR', { type: 'PAYMENT_PENDING', attendanceId: 'a9' }));
    expect(usePendenciaStore.getState()).toMatchObject({ pagando: 'a9', recusado: false });
    tocou?.(resposta('n15', 'PAGAR', { type: 'PAYMENT_REFUSED', attendanceId: 'a8' }));
    expect(usePendenciaStore.getState()).toMatchObject({ pagando: 'a8', recusado: true });
    usePendenciaStore.getState().fechar();
  });

  it('AGORA NÃO só fecha a notificação', () => {
    renderHook(() => usePushRegistration());
    tocou?.(resposta('n6', 'AGORA_NAO', { type: 'SWAP_REQUESTED', swapRequestId: 'r1' }));
    expect(n.dismissNotificationAsync).toHaveBeenCalledWith('n6');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockResponder).not.toHaveBeenCalled();
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

describe('usePushRegistration — o que sobra (cobertura-98)', () => {
  it('com o app aberto, o banner não sai (o aviso com OK já diz)', async () => {
    await expect(handlerDoModulo.handleNotification()).resolves.toEqual({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });

  it('canais, categorias e o fechar da troca recusando não derrubam nada', async () => {
    const antes = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    n.setNotificationChannelAsync.mockRejectedValue(new Error('x'));
    n.setNotificationCategoryAsync.mockRejectedValue(new Error('x'));
    n.dismissNotificationAsync.mockRejectedValue(new Error('x'));
    try {
      renderHook(() => usePushRegistration());
      tocou?.(resposta('n7', 'CONFIRMAR', { type: 'SWAP_OFFERED', offerId: 'o1' }));
      await act(async () => {});
      expect(mockNavigate).toHaveBeenCalledWith('fila');
    } finally {
      Object.defineProperty(Platform, 'OS', { value: antes, configurable: true });
    }
  });

  it('sem o projectId do app.json, usa o do EAS', async () => {
    const C = jest.requireMock('expo-constants') as Record<string, unknown>;
    const config = C.expoConfig;
    C.expoConfig = undefined;
    C.easConfig = { projectId: 'eas' };
    try {
      renderHook(() => usePushRegistration());
      await waitFor(() => expect(n.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'eas' }));
    } finally {
      C.expoConfig = config;
      delete C.easConfig;
    }
  });

  it('erro sem mensagem: a tentativa e a falha ficam no painel pelo texto do erro', async () => {
    jest.useFakeTimers();
    try {
      mockRegisterDevice.mockRejectedValueOnce('caiu').mockRejectedValueOnce({ response: { status: 400 } });
      renderHook(() => usePushRegistration());
      await waitFor(() => expect(usePushDiagnosticsStore.getState().envio).toBe('tentando'));
      await act(async () => {
        jest.advanceTimersByTime(3_000);
      });
      await waitFor(() => expect(usePushDiagnosticsStore.getState().envio).toBe('falhou'));
    } finally {
      jest.useRealTimers();
    }
  });

  it('push sem data vira aviso normal', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderHook(() => usePushRegistration());
    recebido?.({ request: { content: { title: 'Oi', body: 'b' } } });
    expect(alerta).toHaveBeenCalledWith('Oi', 'b', [{ text: 'OK' }]);
  });
});
