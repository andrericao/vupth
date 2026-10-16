import { Alert, Linking } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Settings } from '@screens/Settings';

// cobertura-98 (08/10): Perfil — o endereço principal, as linhas da conta, sair,
// deletar a conta (com os erros) e o convite do visitante.

const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockLogout = jest.fn();
const mockGetMain = jest.fn();
const mockDelete = jest.fn();
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
jest.mock('@services/profileService', () => ({
  profileService: { deleteAccount: (...a: unknown[]) => mockDelete(...a) },
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ user: mockUser, accessToken: mockToken, isAuthenticated: !!mockToken, logout: mockLogout }),
}));
jest.mock('@stores/comingSoonStore', () => ({
  useComingSoonStore: (sel: (s: unknown) => unknown) => sel({ counts: {} }),
}));
jest.mock('@components/DeleteAccountModal', () => {
  const { Text, View } = jest.requireActual('react-native');
  return {
    DeleteAccountModal: (p: { visible: boolean; error: string | null; onConfirm: (s: string) => void; onClose: () => void }) =>
      p.visible ? (
        <View>
          <Text onPress={() => p.onConfirm('senha')}>confirmar-delete</Text>
          <Text onPress={p.onClose}>fechar-delete</Text>
          {p.error ? <Text>{`erro:${p.error}`}</Text> : null}
        </View>
      ) : null,
  };
});

jest.setTimeout(60000);

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockUser = { first_name: 'Alexia', last_name: 'Souza', email: 'a@b.com' };
  mockToken = 'tk';
  mockGetMain.mockResolvedValue({ data: { street: 'Rua A', number: '10', neighborhood: 'Centro' } });
  mockDelete.mockResolvedValue({});
  mockLogout.mockResolvedValue(undefined);
});

describe('Perfil — a conta', () => {
  it('mostra o endereço principal e as iniciais', async () => {
    const { findByText, getByText } = renderWithProviders(<Settings />);
    expect(await findByText('Rua A, 10 — Centro')).toBeTruthy();
    expect(getByText('AS')).toBeTruthy();
  });

  it('sem endereço principal: "Não informado"', async () => {
    mockGetMain.mockRejectedValue(new Error('404'));
    const { findAllByText } = renderWithProviders(<Settings />);
    expect((await findAllByText('Não informado')).length).toBeGreaterThan(0);
  });

  it('sem nome, a inicial vem do e-mail', async () => {
    mockUser = { email: 'z@b.com' };
    const { findByText } = renderWithProviders(<Settings />);
    expect(await findByText('Z')).toBeTruthy();
  });

  it('as linhas abrem as telas da conta', async () => {
    const { getByText } = renderWithProviders(<Settings />);
    for (const [linha, tela] of [
      ['Dados pessoais', 'editProfile'],
      ['E-mail', 'editEmail'],
      ['Senha', 'editPassword'],
      ['Endereços', 'editAddress'],
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

  it('sair pergunta, sai e volta ao Início', async () => {
    const { getByTestId } = renderWithProviders(<Settings />);
    fireEvent.press(getByTestId('logout'));
    const botoes = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => Promise<void> }[];
    await act(async () => {
      await botoes.find((b) => b.text === 'Sair')!.onPress!();
    });
    expect(mockLogout).toHaveBeenCalled();
    expect(mockParentNavigate).toHaveBeenCalledWith('homeTab', { screen: 'home', pop: true });
  });
});

describe('Perfil — deletar conta', () => {
  async function abrir() {
    const tela = renderWithProviders(<Settings />);
    fireEvent.press(tela.getByTestId('delete-account'));
    return tela;
  }

  it('apaga, sai e volta ao Início', async () => {
    const { getByText } = await abrir();
    await act(async () => {
      fireEvent.press(getByText('confirmar-delete'));
    });
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockDelete).toHaveBeenCalledWith('tk', 'senha');
    expect(mockParentNavigate).toHaveBeenCalledWith('homeTab', { screen: 'home', pop: true });
  });

  it('senha errada', async () => {
    mockDelete.mockRejectedValue({ response: { data: { code: 'CURRENT_PASSWORD_INVALID' } } });
    const { getByText, findByText } = await abrir();
    fireEvent.press(getByText('confirmar-delete'));
    expect(await findByText('erro:Senha incorreta. Confira e tente de novo.')).toBeTruthy();
  });

  it('bloqueio temporário mostra a mensagem do servidor, ou a padrão', async () => {
    mockDelete.mockRejectedValueOnce({ response: { data: { code: 'ACCOUNT_DELETE_NOT_ALLOWED', message: 'Saia da fila' } } });
    const { getByText, findByText } = await abrir();
    fireEvent.press(getByText('confirmar-delete'));
    expect(await findByText('erro:Saia da fila')).toBeTruthy();

    mockDelete.mockRejectedValueOnce({ response: { data: { code: 'ACCOUNT_DELETE_NOT_ALLOWED' } } });
    fireEvent.press(getByText('confirmar-delete'));
    expect(await findByText(/erro:Você tem um atendimento em andamento/)).toBeTruthy();
  });

  it('outro erro: a mensagem do servidor, a do erro, ou a padrão', async () => {
    mockDelete.mockRejectedValueOnce({ response: { data: { message: 'Falhou' } } });
    const { getByText, findByText } = await abrir();
    fireEvent.press(getByText('confirmar-delete'));
    expect(await findByText('erro:Falhou')).toBeTruthy();

    mockDelete.mockRejectedValueOnce(new Error('Network Error'));
    fireEvent.press(getByText('confirmar-delete'));
    expect(await findByText('erro:Network Error')).toBeTruthy();

    mockDelete.mockRejectedValueOnce({});
    fireEvent.press(getByText('confirmar-delete'));
    expect(await findByText('erro:Erro ao deletar conta')).toBeTruthy();
  });

  it('fechar o modal', async () => {
    const { getByText, queryByText } = await abrir();
    fireEvent.press(getByText('fechar-delete'));
    expect(queryByText('confirmar-delete')).toBeNull();
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

  it('os Termos', () => {
    const { getByTestId } = renderWithProviders(<Settings />);
    fireEvent.press(getByTestId('terms'));
    expect(mockNavigate).toHaveBeenCalledWith('terms');
  });
});
