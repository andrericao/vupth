import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Login } from '@screens/Login';

// Contrato do Backend (03/10, fd9a3af): login com e-mail sem conta volta
// 401 EMAIL_NOT_FOUND — a tela oferece o cadastro com o e-mail já digitado;
// senha errada segue 401 BAD_CREDENTIALS; 429 vira "muitas tentativas".

const mockNavigate = jest.fn();
const mockLogin = jest.fn();

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, reset: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: { login: typeof mockLogin }) => unknown) => sel({ login: mockLogin }),
}));

jest.setTimeout(90000); // render com GluestackUIProvider e pesado sob o jest

async function entrar() {
  const utils = renderWithProviders(<Login />);
  fireEvent.changeText(utils.getByPlaceholderText('E-mail'), ' semconta@vupth.com ');
  fireEvent.changeText(utils.getByPlaceholderText('Senha'), 'Senha@123');
  await act(async () => {
    fireEvent.press(utils.getByTestId('primary-login'));
  });
  return utils;
}

describe('Login — erros do contrato de 03/10', () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => alert.mockRestore());

  it('401 EMAIL_NOT_FOUND: "E-mail sem conta" com Corrigir e Criar conta, que leva o e-mail', async () => {
    mockLogin.mockRejectedValue({ response: { status: 401, data: { code: 'EMAIL_NOT_FOUND' } } });

    await entrar();

    await waitFor(() => expect(alert).toHaveBeenCalled());
    const [titulo, , botoes] = alert.mock.calls[0];
    expect(titulo).toBe('E-mail sem conta');
    const textos = (botoes as { text: string }[]).map((b) => b.text);
    expect(textos).toEqual(['Corrigir', 'Criar conta']);

    (botoes as { text: string; onPress?: () => void }[])[1].onPress?.();
    expect(mockNavigate).toHaveBeenCalledWith('signUp', expect.objectContaining({ email: 'semconta@vupth.com' }));
  });

  it('401 BAD_CREDENTIALS: a mensagem do servidor, como antes', async () => {
    mockLogin.mockRejectedValue({ response: { status: 401, data: { code: 'BAD_CREDENTIALS', message: 'Senha incorreta' } } });

    await entrar();

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Erro', 'Senha incorreta'));
  });

  it('429: "muitas tentativas" com o tempo do Retry-After', async () => {
    mockLogin.mockRejectedValue({
      response: { status: 429, data: { code: 'TOO_MANY_REQUESTS' }, headers: { 'retry-after': '90' } },
    });

    await entrar();

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Muitas tentativas', 'Muitas tentativas seguidas. Tente de novo em 2 min.'),
    );
  });
});
