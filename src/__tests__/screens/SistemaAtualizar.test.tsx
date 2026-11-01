import { Alert } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import * as Updates from 'expo-updates';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Sistema } from '@screens/Sistema';
import { useComingSoonStore } from '@stores/comingSoonStore';

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

  it('verificação pendurada vira aviso, não "Verificando..." para sempre', async () => {
    jest.useFakeTimers();
    up.checkForUpdateAsync.mockReturnValue(new Promise(() => {}));
    const tela = renderWithProviders(<Sistema />);
    await act(async () => {
      fireEvent.press(tela.getByTestId('check-update'));
    });
    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(alertSpy).toHaveBeenCalledWith('Não foi possível verificar', expect.any(String));
    jest.useRealTimers();
  });

  it('a linha da versão mostra o OTA aplicado', () => {
    const { getByText } = renderWithProviders(<Sistema />);
    expect(getByText(/OTA abcdef12/)).toBeTruthy();
  });
});

describe('Sistema — o que sobra (cobertura-98)', () => {
  afterEach(() => {
    up.createdAt = new Date('2026-10-08T12:00:00Z') as never;
    useComingSoonStore.setState({ counts: {} });
  });

  it('"Verificando..." enquanto o servidor do OTA responde', async () => {
    let soltar: (v: object) => void = () => {};
    up.checkForUpdateAsync.mockImplementation(() => new Promise((r) => (soltar = r)));
    const tela = await verificar();
    expect(tela.getByText('Verificando...')).toBeTruthy();
    await act(async () => soltar({ isAvailable: false }));
    expect(tela.getByText('Verificar atualização')).toBeTruthy();
  });

  it('OTA sem data: só o id', () => {
    up.createdAt = null as never;
    const { getByText } = renderWithProviders(<Sistema />);
    expect(getByText(/OTA abcdef12$/)).toBeTruthy();
  });

  it('as funcionalidades aguardadas, a mais tocada primeiro (7 toques na versão)', () => {
    useComingSoonStore.setState({ counts: { pouco: 1, nada: 0, muito: 5 } });
    const tela = renderWithProviders(<Sistema />);
    for (let i = 0; i < 7; i++) fireEvent.press(tela.getByTestId('version-line'));
    const textos = tela.getAllByText(/^(pouco|muito|nada)$/).map((t) => t.props.children);
    expect(textos).toEqual(['muito', 'pouco']);
  });
});

