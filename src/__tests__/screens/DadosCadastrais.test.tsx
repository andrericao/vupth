import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { DadosCadastrais } from '@screens/DadosCadastrais';

// dados-cadastrais-no-submenu (17/10): a tela que a linha "Dados cadastrais" do
// Perfil abre, com as quatro linhas que antes ficavam expandidas.

const mockNavigate = jest.fn();
const mockGetMain = jest.fn();
const mockParentNavigate = jest.fn();
const mockLogout = jest.fn();
const mockDelete = jest.fn();
const mockDeactivate = jest.fn();
let mockUser: Record<string, unknown> | null = null;
let mockToken: string | null = 'tk';

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), canGoBack: () => true, getParent: () => ({ navigate: mockParentNavigate }) }),
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
  profileService: {
    deleteAccount: (...a: unknown[]) => mockDelete(...a),
    deactivateAccount: (...a: unknown[]) => mockDeactivate(...a),
  },
}));
jest.mock('@components/DeleteAccountModal', () => {
  const { Text, View } = jest.requireActual('react-native');
  return {
    DeleteAccountModal: (p: { visible: boolean; modo?: string; error: string | null; onConfirm: (s: string) => void; onClose: () => void }) =>
      p.visible ? (
        <View>
          <Text>{`modo:${p.modo}`}</Text>
          <Text onPress={() => p.onConfirm('senha')}>confirmar</Text>
          <Text onPress={p.onClose}>fechar</Text>
          {p.error ? <Text>{`erro:${p.error}`}</Text> : null}
        </View>
      ) : null,
  };
});
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: mockUser, accessToken: mockToken, logout: mockLogout }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { first_name: 'Alexia', last_name: 'Souza', email: 'a@b.com' };
  mockToken = 'tk';
  mockGetMain.mockResolvedValue({ data: { street: 'Rua A', number: '10', neighborhood: 'Centro' } });
});

describe('DadosCadastrais', () => {
  it('mostra nome, e-mail, senha oculta e o endereço principal', async () => {
    const { findByText, getByText } = renderWithProviders(<DadosCadastrais />);
    expect(await findByText('Rua A, 10 — Centro')).toBeTruthy();
    expect(getByText('Alexia Souza')).toBeTruthy();
    expect(getByText('a@b.com')).toBeTruthy();
    expect(getByText('••••••')).toBeTruthy();
  });

  it('sem endereço principal e sem nome: "Não informado"', async () => {
    mockGetMain.mockRejectedValue(new Error('404'));
    mockUser = { email: 'z@b.com' };
    const { findAllByText } = renderWithProviders(<DadosCadastrais />);
    expect((await findAllByText('Não informado')).length).toBe(2);
  });

  it('sem sessão não busca o endereço e o e-mail cai no traço', async () => {
    mockToken = null;
    mockUser = null;
    const { getByText } = renderWithProviders(<DadosCadastrais />);
    expect(getByText('—')).toBeTruthy();
    expect(mockGetMain).not.toHaveBeenCalled();
    await act(async () => {});
  });

  it('as linhas abrem as telas da conta', async () => {
    const { getByText } = renderWithProviders(<DadosCadastrais />);
    for (const [linha, tela] of [
      ['Dados pessoais', 'editProfile'],
      ['E-mail', 'editEmail'],
      ['Senha', 'editPassword'],
      ['Endereços', 'editAddress'],
    ]) {
      fireEvent.press(getByText(linha));
      expect(mockNavigate).toHaveBeenLastCalledWith(tela);
    }
    await act(async () => {});
  });
});

// desativar-conta e excluir-conta (Andre, 23/10): saíram de Configurações e moram aqui.
describe('DadosCadastrais — desativar e excluir conta', () => {
  async function abrir(testID: string) {
    const tela = renderWithProviders(<DadosCadastrais />);
    await act(async () => {});
    fireEvent.press(tela.getByTestId(testID));
    return tela;
  }

  it('Excluir: apaga com a senha, sai e volta ao Início', async () => {
    mockDelete.mockResolvedValue({});
    const { getByText } = await abrir('delete-account');
    expect(getByText('modo:excluir')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByText('confirmar'));
    });
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockDelete).toHaveBeenCalledWith('tk', 'senha');
    expect(mockParentNavigate).toHaveBeenCalledWith('homeTab', { screen: 'home', pop: true });
  });

  it('Desativar: desativa com a senha, sai e volta ao Início', async () => {
    mockDeactivate.mockResolvedValue({});
    const { getByText } = await abrir('deactivate-account');
    expect(getByText('modo:desativar')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByText('confirmar'));
    });
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockDeactivate).toHaveBeenCalledWith('tk', 'senha');
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockParentNavigate).toHaveBeenCalledWith('homeTab', { screen: 'home', pop: true });
  });

  it('senha errada: erro de campo, sem sair', async () => {
    mockDeactivate.mockRejectedValue({ response: { data: { code: 'CURRENT_PASSWORD_INVALID' } } });
    const { getByText, findByText } = await abrir('deactivate-account');
    fireEvent.press(getByText('confirmar'));
    expect(await findByText('erro:Senha incorreta. Confira e tente de novo.')).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('bloqueio temporário mostra a mensagem do servidor, ou a padrão', async () => {
    mockDeactivate.mockRejectedValueOnce({ response: { data: { code: 'ACCOUNT_DEACTIVATE_NOT_ALLOWED', message: 'Saia da fila' } } });
    const { getByText, findByText } = await abrir('deactivate-account');
    fireEvent.press(getByText('confirmar'));
    expect(await findByText('erro:Saia da fila')).toBeTruthy();

    mockDeactivate.mockRejectedValueOnce({ response: { data: { code: 'ACCOUNT_DEACTIVATE_NOT_ALLOWED' } } });
    fireEvent.press(getByText('confirmar'));
    expect(await findByText(/erro:Você tem um atendimento em andamento/)).toBeTruthy();
  });

  it('outro erro: a mensagem do servidor ou a padrão de cada ação', async () => {
    mockDelete.mockRejectedValueOnce({ response: { data: { message: 'Falhou' } } });
    const ex = await abrir('delete-account');
    fireEvent.press(ex.getByText('confirmar'));
    expect(await ex.findByText('erro:Falhou')).toBeTruthy();
    ex.unmount();

    mockDeactivate.mockRejectedValueOnce({});
    const de = await abrir('deactivate-account');
    fireEvent.press(de.getByText('confirmar'));
    expect(await de.findByText('erro:Erro ao desativar conta')).toBeTruthy();
    mockDelete.mockRejectedValueOnce({});
    fireEvent.press(de.getByText('fechar'));
    fireEvent.press(de.getByTestId('delete-account'));
    fireEvent.press(de.getByText('confirmar'));
    expect(await de.findByText('erro:Erro ao deletar conta')).toBeTruthy();
  });

  it('fechar o modal', async () => {
    const { getByText, queryByText } = await abrir('delete-account');
    fireEvent.press(getByText('fechar'));
    expect(queryByText('confirmar')).toBeNull();
  });
});
