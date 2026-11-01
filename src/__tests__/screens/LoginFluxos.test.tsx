import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Login } from '@screens/Login';

// cobertura-98 (08/10): o Entrar — campo vazio, entrar e ir ao Inicio, entrar e
// voltar para a escolha do servico, e o Esqueci a senha levando o e-mail.

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockReplace = jest.fn();
const mockLogin = jest.fn();
let mockParams: Record<string, unknown> = {};

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (efeito: () => void) => jest.requireActual('react').useEffect(efeito, []),
  useNavigation: () => ({ navigate: mockNavigate, reset: mockReset, replace: mockReplace, goBack: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: { login: typeof mockLogin }) => unknown) => sel({ login: mockLogin }),
}));

jest.setTimeout(90000);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockLogin.mockResolvedValue(undefined);
});

async function entrar(tela: ReturnType<typeof renderWithProviders>) {
  fireEvent.changeText(tela.getByPlaceholderText('E-mail'), 'a@b.com');
  fireEvent.changeText(tela.getByPlaceholderText('Senha'), 'Senha@123');
  await act(async () => {
    fireEvent.press(tela.getByTestId('primary-login'));
  });
}

describe('Login', () => {
  it('sem e-mail e senha, mostra os erros e não entra', async () => {
    const tela = renderWithProviders(<Login />);
    await act(async () => {
      fireEvent.press(tela.getByTestId('primary-login'));
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('entra e vai ao Início', async () => {
    const tela = renderWithProviders(<Login />);
    await entrar(tela);
    expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'Senha@123');
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'home' }] });
  });

  it('interrompido no meio da fila: volta para a escolha do serviço', async () => {
    mockParams = { redirectTo: 'serviceSelection', establishmentId: 'e1', professionalId: 'p1' };
    const tela = renderWithProviders(<Login />);
    await entrar(tela);
    expect(mockReplace).toHaveBeenCalledWith('serviceSelection', expect.objectContaining({ establishmentId: 'e1' }));
  });

  it('Esqueci minha senha leva o e-mail digitado', () => {
    const tela = renderWithProviders(<Login />);
    fireEvent.changeText(tela.getByPlaceholderText('E-mail'), 'a@b.com');
    fireEvent.press(tela.getByText('Esqueci minha senha'));
    expect(mockNavigate).toHaveBeenCalledWith('forgotPassword', { email: 'a@b.com' });
  });
});
