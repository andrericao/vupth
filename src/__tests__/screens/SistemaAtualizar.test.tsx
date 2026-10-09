import { Alert } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import * as Updates from 'expo-updates';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Sistema } from '@screens/Sistema';

// cobertura-98 (08/10): "Verificar atualização" — baixa e reinicia, já está na
// mais nova, ou não dá para verificar; e o OTA na linha da versão.

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
  runtimeVersion: '1.0.3',
  channel: 'preview',
  updateId: 'abcdef1234567890',
  createdAt: new Date('2026-10-08T12:00:00Z'),
}));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@components/WsDiagnostics', () => ({ WsDiagnostics: () => null }));
jest.mock('@components/PushDiagnostics', () => ({ PushDiagnostics: () => null }));

jest.setTimeout(90000);

const up = Updates as unknown as Record<string, jest.Mock>;
let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

async function verificar() {
  const tela = renderWithProviders(<Sistema />);
  await act(async () => {
    fireEvent.press(tela.getByTestId('check-update'));
  });
  return tela;
}

describe('Sistema — Verificar atualização', () => {
  it('com atualização, baixa e o OK reinicia', async () => {
    up.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
    up.fetchUpdateAsync.mockResolvedValue({});
    await verificar();
    expect(up.fetchUpdateAsync).toHaveBeenCalled();
    const botoes = alertSpy.mock.calls[0][2] as { onPress: () => void }[];
    botoes[0].onPress();
    expect(up.reloadAsync).toHaveBeenCalled();
  });

  it('já na mais nova', async () => {
    up.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
    await verificar();
    expect(alertSpy).toHaveBeenCalledWith('Tudo certo', expect.any(String));
  });

  it('sem poder verificar (Expo Go)', async () => {
    up.checkForUpdateAsync.mockRejectedValue(new Error('x'));
    await verificar();
    expect(alertSpy).toHaveBeenCalledWith('Não foi possível verificar', expect.any(String));
  });

  it('a linha da versão mostra o OTA aplicado', () => {
    const { getByText } = renderWithProviders(<Sistema />);
    expect(getByText(/OTA abcdef12/)).toBeTruthy();
  });
});
