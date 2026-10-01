import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Settings } from '@screens/Settings';
import { Sistema } from '@screens/Sistema';

// Andre 2026-09-16: "quero que o menu fique igual o do partner (com submenus,
// a versao deve ser escondida)". O Perfil passa a ser um menu em grupos, e a
// versao, o atualizar e os diagnosticos moram atras de "Versão do app".

const mockNavigate = jest.fn();
let mockNoNavegador = false;

jest.mock('@utils/ehNavegador', () => ({ ehNavegador: () => mockNoNavegador }));

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
  runtimeVersion: '1.0.0',
  channel: 'staging',
  updateId: null,
  createdAt: null,
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, getParent: () => ({ navigate: jest.fn() }) }),
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@components/WsDiagnostics', () => {
  const { Text } = jest.requireActual('react-native');
  return { WsDiagnostics: () => <Text>painel-ws</Text> };
});
jest.mock('@components/PushDiagnostics', () => {
  const { Text } = jest.requireActual('react-native');
  return { PushDiagnostics: () => <Text>painel-push</Text> };
});
jest.mock('@components/DeleteAccountModal', () => ({ DeleteAccountModal: () => null }));
let mockLogado = true;
jest.mock('@stores/authStore', () => ({
  useAuthStore: (seletor: (s: unknown) => unknown) =>
    seletor({
      user: mockLogado ? { first_name: 'Alexia', email: 'a@b.com' } : null,
      accessToken: mockLogado ? 'token-de-teste' : null,
      isAuthenticated: mockLogado,
      logout: jest.fn(),
    }),
}));
jest.mock('@stores/comingSoonStore', () => ({
  useComingSoonStore: (seletor: (s: unknown) => unknown) =>
    seletor({ counts: { favoritos: 3 } }),
}));

describe('Perfil — menu em grupos, como o do partner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogado = true;
  });

  // Andre, 26/09: o visitante não vê o menu "Versão do app" — vê a versão e a data.
  it('VISITANTE: sem o menu Sistema; a versão aparece no rodapé, sem toque', () => {
    mockLogado = false;
    const { queryByText, getByTestId } = renderWithProviders(<Settings />);
    expect(queryByText('Versão do app')).toBeNull();
    expect(queryByText('SISTEMA')).toBeNull();
    expect(getByTestId('versao-visitante').props.children).toBe('Versão 1.0.0');
  });

  it('mostra os grupos Conta e Sistema', () => {
    const { getByText } = renderWithProviders(<Settings />);
    expect(getByText('CONTA')).toBeTruthy();
    expect(getByText('SISTEMA')).toBeTruthy();
  });

  it('a versão NÃO aparece no Perfil — fica escondida atrás do submenu', () => {
    const { queryByTestId, queryByText } = renderWithProviders(<Settings />);
    expect(queryByTestId('version-line')).toBeNull();
    expect(queryByTestId('check-update')).toBeNull();
    expect(queryByText(/staging/)).toBeNull();
  });

  it('"Versão do app" leva à tela Sistema', () => {
    const { getByText } = renderWithProviders(<Settings />);
    fireEvent.press(getByText('Versão do app'));
    expect(mockNavigate).toHaveBeenCalledWith('sistema');
  });
});

describe('Sistema — versão, atualização e diagnósticos', () => {
  beforeEach(() => {
    mockNoNavegador = false;
  });

  it('mostra a versão e o botão de atualizar no app', () => {
    const { getByTestId, getByText } = renderWithProviders(<Sistema />);
    expect(getByTestId('check-update')).toBeTruthy();
    expect(getByText(/1\.0\.0 · staging/)).toBeTruthy();
  });

  it('no navegador mostra SÓ a versão — sem botão e sem texto de como atualizar', () => {
    // Decisão do Andre em 18/09, igual no partner: ali não existe OTA, então o
    // botão não teria o que fazer e a instrução de recarregar é do navegador.
    mockNoNavegador = true;
    const { getByTestId, queryByTestId, queryByText } = renderWithProviders(<Sistema />);
    expect(getByTestId('version-line')).toBeTruthy();
    expect(queryByTestId('check-update')).toBeNull();
    expect(queryByTestId('web-update-hint')).toBeNull();
    expect(queryByText(/Ctrl\+Shift\+R/)).toBeNull();
  });

  it('os painéis técnicos só abrem com 7 toques na versão', () => {
    const { getByTestId, queryByText } = renderWithProviders(<Sistema />);
    for (let i = 0; i < 6; i++) fireEvent.press(getByTestId('version-line'));
    expect(queryByText('painel-ws')).toBeNull();
    expect(queryByText('Funcionalidades aguardadas')).toBeNull();

    fireEvent.press(getByTestId('version-line'));
    expect(queryByText('painel-ws')).toBeTruthy();
    expect(queryByText('painel-push')).toBeTruthy();
    expect(queryByText('Funcionalidades aguardadas')).toBeTruthy();
  });
});

describe('Perfil — Aparência (Andre, 26/09)', () => {
  it('o Perfil leva ao submenu Aparência', () => {
    const { getByText } = renderWithProviders(<Settings />);
    expect(getByText('APARÊNCIA')).toBeTruthy();
    fireEvent.press(getByText('Tema e tamanho da fonte'));
    expect(mockNavigate).toHaveBeenCalledWith('aparencia');
  });
});
