import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { DadosCadastrais } from '@screens/DadosCadastrais';

// dados-cadastrais-no-submenu (17/10): a tela que a linha "Dados cadastrais" do
// Perfil abre, com as quatro linhas que antes ficavam expandidas.

const mockNavigate = jest.fn();
const mockGetMain = jest.fn();
let mockUser: Record<string, unknown> | null = null;
let mockToken: string | null = 'tk';

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), canGoBack: () => true }),
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
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: mockUser, accessToken: mockToken }),
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
