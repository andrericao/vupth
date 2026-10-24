import { Alert, Linking } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Settings } from '@screens/Settings';

// cobertura-98 (08/10): Perfil — o endereço principal, as linhas da conta, sair,
// deletar a conta (com os erros) e o convite do visitante.

const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockLogout = jest.fn();
const mockGetMain = jest.fn();
let mockUser: Record<string, unknown> | null = { first_name: 'Alexia', last_name: 'Souza', email: 'a@b.com' };
let mockToken: string | null = 'tk';

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-updates', () => ({ runtimeVersion: '1.0.0', channel: 'preview', updateId: null, createdAt: null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, getParent: () => ({ navigate: mockParentNavigate }) }),
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react');
    useEffect(() => {
      cb();
    }, [cb]);
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@services/addressService', () => ({
  addressService: { getMain: (...a: unknown[]) => mockGetMain(...a) },
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ user: mockUser, accessToken: mockToken, isAuthenticated: !!mockToken, logout: mockLogout }),
}));
jest.mock('@stores/comingSoonStore', () => ({
  useComingSoonStore: (sel: (s: unknown) => unknown) => sel({ counts: {} }),
}));

jest.setTimeout(60000);

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockUser = { first_name: 'Alexia', last_name: 'Souza', email: 'a@b.com' };
  mockToken = 'tk';
  mockGetMain.mockResolvedValue({ data: { street: 'Rua A', number: '10', neighborhood: 'Centro' } });
  mockLogout.mockResolvedValue(undefined);
});

describe('Perfil — a conta', () => {
  it('mostra as iniciais e a linha "Dados cadastrais" com nome e e-mail', async () => {
    const { findByText, getByText } = renderWithProviders(<Settings />);
    expect(await findByText('Dados cadastrais')).toBeTruthy();
    expect(getByText('Alexia Souza · a@b.com')).toBeTruthy();
    expect(getByText('AS')).toBeTruthy();
  });

  it('os dados não ficam expandidos no Perfil (dados-cadastrais-no-submenu)', async () => {
    const { findByText, queryByText } = renderWithProviders(<Settings />);
    await findByText('Dados cadastrais');
    for (const linha of ['Dados pessoais', 'Senha', 'Endereços']) expect(queryByText(linha)).toBeNull();
  });

  it('sem nome, a inicial vem do e-mail', async () => {
    mockUser = { email: 'z@b.com' };
    const { findByText } = renderWithProviders(<Settings />);
    expect(await findByText('Z')).toBeTruthy();
  });

  it('as linhas abrem as telas da conta', async () => {
    const { getByText } = renderWithProviders(<Settings />);
    for (const [linha, tela] of [
      ['Dados cadastrais', 'dadosCadastrais'],
      ['Tema e tamanho da fonte', 'aparencia'],
    ]) {
      fireEvent.press(getByText(linha));
      expect(mockNavigate).toHaveBeenLastCalledWith(tela);
    }
    await act(async () => {});
  });

  it('Suporte abre o site de suporte no navegador', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByText } = renderWithProviders(<Settings />);
    fireEvent.press(getByText('Suporte'));
    expect(abrir).toHaveBeenCalledWith('https://vupth-support.pages.dev/');
    abrir.mockRestore();
    await act(async () => {});
  });

  it('o Sair é o do Partner: texto "Sair da conta", solto, com o rótulo "Sair" (botao-sair-igual)', async () => {
    const { getByTestId, getByText } = renderWithProviders(<Settings />);
    expect(getByTestId('logout').props.accessibilityLabel).toBe('Sair');
    expect(getByText('Sair da conta')).toBeTruthy();
    await act(async () => {});
  });

  // sair-da-conta-acima-dos-termos (André, 24/10): o Sair fica logo acima dos Termos, no mesmo rodapé, centralizado.
  it('o Sair da conta fica no rodapé, logo acima de Termos e Política, centralizado', async () => {
    const { getByTestId, getByText } = renderWithProviders(<Settings />);
    type No = { parent: No | null; findAll: (f: (x: { props?: { testID?: string; children?: unknown } }) => boolean) => unknown[] };
    let no = getByTestId('logout').parent as No | null;
    // o menor ancestral que tem o Sair E os Termos e o rodape: nao pode conter os grupos do Perfil
    while (no && !(no.findAll((x) => x.props?.testID === 'link-termos').length > 0)) no = no.parent;
    expect(no).not.toBeNull();
    expect(no!.findAll((x) => x.props?.children === 'Dados cadastrais')).toHaveLength(0);
    expect(getByText('Sair da conta').props.textAlign).toBe('center');
    await act(async () => {});
  });

  it('sair pergunta (só o título "Sair da conta", sem corpo), sai e volta ao Início', async () => {
    const { getByTestId } = renderWithProviders(<Settings />);
    fireEvent.press(getByTestId('logout'));
    // GUIA_DE_TEXTO.md §4.7: a pergunta já está nos dois botões, Sair e Cancelar.
    expect(alertSpy.mock.calls[0][0]).toBe('Sair da conta');
    expect(alertSpy.mock.calls[0][1]).toBeUndefined();
    const botoes = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => Promise<void> }[];
    expect(botoes.map((b) => b.text)).toEqual(['Cancelar', 'Sair']);
    await act(async () => {
      await botoes.find((b) => b.text === 'Sair')!.onPress!();
    });
    expect(mockLogout).toHaveBeenCalled();
    expect(mockParentNavigate).toHaveBeenCalledWith('homeTab', { screen: 'home', pop: true });
  });
});

describe('Perfil — conta', () => {
  it('em Configurações fica só o Sair; Excluir e Desativar conta moram em Dados cadastrais', async () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<Settings />);
    expect(getByTestId('logout')).toBeTruthy();
    expect(queryByTestId('delete-account')).toBeNull();
    expect(queryByTestId('deactivate-account')).toBeNull();
    await act(async () => {});
  });
});

describe('Perfil — visitante', () => {
  beforeEach(() => {
    mockUser = null;
    mockToken = null;
  });

  it('não busca endereço', () => {
    renderWithProviders(<Settings />);
    expect(mockGetMain).not.toHaveBeenCalled();
  });

  it('Criar conta e Já tenho conta levam ao cadastro e ao Entrar', () => {
    const { getByText } = renderWithProviders(<Settings />);
    fireEvent.press(getByText('Criar conta grátis'));
    expect(mockParentNavigate).toHaveBeenLastCalledWith('homeTab', { screen: 'signUp', params: {}, pop: true });
    fireEvent.press(getByText('Já tenho conta'));
    expect(mockParentNavigate).toHaveBeenLastCalledWith('homeTab', { screen: 'login', params: {}, pop: true });
  });

  it('Termos de uso e Política de privacidade: dois links, cada um na sua tela do app', () => {
    const { getByTestId, getByText } = renderWithProviders(<Settings />);
    expect(getByText('Termos de uso')).toBeTruthy();
    expect(getByText('Política de privacidade')).toBeTruthy();
    fireEvent.press(getByTestId('link-termos'));
    expect(mockNavigate).toHaveBeenLastCalledWith('terms');
    fireEvent.press(getByTestId('link-privacidade'));
    expect(mockNavigate).toHaveBeenLastCalledWith('privacy');
  });
});
