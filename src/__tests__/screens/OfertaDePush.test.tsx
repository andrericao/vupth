import { fireEvent, waitFor } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { renderWithProviders } from '../utils/renderWithProviders';
import { PushPermission } from '@screens/PushPermission';
import { useFirstRunStore } from '@stores/firstRunStore';
import { PUSH_PERGUNTADO_KEY, podeOferecerPush, recusarAvisoDePush } from '@hooks/ofertaDePush';

// ligar-push-permission (Andre, 05/10): a tela 10 aparece na primeira entrada
// numa fila, ANTES da caixa do sistema; os dois botoes marcam como perguntado.

const mockGetPermissions = jest.fn();
let mockIsDevice = true;

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockGetPermissions(),
}));
jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice;
  },
}));

const getItem = SecureStore.getItemAsync as jest.Mock;
const setItem = SecureStore.setItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockIsDevice = true;
  mockGetPermissions.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
  getItem.mockResolvedValue(null);
  setItem.mockResolvedValue(undefined);
  useFirstRunStore.setState({ pushAsked: false, pushOferta: false, restored: true });
});

describe('podeOferecerPush', () => {
  it('oferece quando a permissão está em aberto e a caixa nunca veio', async () => {
    expect(await podeOferecerPush()).toBe(true);
  });

  it('não oferece a quem já respondeu', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    expect(await podeOferecerPush()).toBe(false);
  });

  it('Android 13+: oferece com "denied" de quem nunca foi perguntado (bateria 10/10 08:06)', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied', canAskAgain: true });
    expect(await podeOferecerPush()).toBe(true);
  });

  it('não oferece quando o sistema não deixa perguntar de novo', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'undetermined', canAskAgain: false });
    expect(await podeOferecerPush()).toBe(false);
  });

  it('não oferece se a caixa do sistema já apareceu', async () => {
    getItem.mockResolvedValue('1');
    expect(await podeOferecerPush()).toBe(false);
    expect(getItem).toHaveBeenCalledWith(PUSH_PERGUNTADO_KEY);
  });

  it('não oferece no emulador', async () => {
    mockIsDevice = false;
    expect(await podeOferecerPush()).toBe(false);
  });

  it('não oferece na web', async () => {
    const antes = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      expect(await podeOferecerPush()).toBe(false);
    } finally {
      Object.defineProperty(Platform, 'OS', { value: antes, configurable: true });
    }
  });

  it('erro do módulo nativo não oferece', async () => {
    mockGetPermissions.mockRejectedValue(new Error('sem módulo'));
    expect(await podeOferecerPush()).toBe(false);
  });
});

describe('recusarAvisoDePush', () => {
  it('marca a caixa do sistema como já perguntada', async () => {
    await recusarAvisoDePush();
    expect(setItem).toHaveBeenCalledWith(PUSH_PERGUNTADO_KEY, '1');
  });

  it('falha ao gravar não quebra', async () => {
    setItem.mockRejectedValue(new Error('cofre'));
    await expect(recusarAvisoDePush()).resolves.toBeUndefined();
  });
});

describe('oferecerPush (firstRunStore)', () => {
  it('liga a tela 10 só se ela ainda não foi mostrada', () => {
    useFirstRunStore.getState().oferecerPush();
    expect(useFirstRunStore.getState().pushOferta).toBe(true);
  });

  it('quem já respondeu não vê de novo', () => {
    useFirstRunStore.setState({ pushAsked: true });
    useFirstRunStore.getState().oferecerPush();
    expect(useFirstRunStore.getState().pushOferta).toBe(false);
  });

  it('antes de ler o cofre, não oferece', () => {
    useFirstRunStore.setState({ restored: false });
    useFirstRunStore.getState().oferecerPush();
    expect(useFirstRunStore.getState().pushOferta).toBe(false);
  });
});

describe('PushPermission', () => {
  it('"Quero ser avisada" fecha a tela e deixa a caixa do sistema vir', async () => {
    useFirstRunStore.setState({ pushOferta: true });
    const { getByTestId } = renderWithProviders(<PushPermission />);
    fireEvent.press(getByTestId('push-accept'));
    await waitFor(() => expect(useFirstRunStore.getState().pushOferta).toBe(false));
    expect(useFirstRunStore.getState().pushAsked).toBe(true);
    expect(setItem).not.toHaveBeenCalledWith(PUSH_PERGUNTADO_KEY, '1');
  });

  it('"Prefiro acompanhar pelo app" fecha a tela e dispensa a caixa do sistema', async () => {
    useFirstRunStore.setState({ pushOferta: true });
    const { getByTestId } = renderWithProviders(<PushPermission />);
    fireEvent.press(getByTestId('push-skip'));
    await waitFor(() => expect(useFirstRunStore.getState().pushOferta).toBe(false));
    expect(useFirstRunStore.getState().pushAsked).toBe(true);
    expect(setItem).toHaveBeenCalledWith(PUSH_PERGUNTADO_KEY, '1');
  });

  it('o "Prefiro acompanhar pelo app" fica acima da barra do celular (print do Andre, 10/10 16h)', () => {
    const { getByTestId } = renderWithProviders(<PushPermission />);
    const estilo = StyleSheet.flatten(getByTestId('push-rodape').props.style);
    expect(estilo.paddingBottom).toBe(34 + 32);
  });
});
