import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { SignUp } from '@screens/SignUp';

// Contrato do Backend (03/10, fd9a3af): o login e o "esqueci" que acham um
// e-mail sem conta mandam para o cadastro com o e-mail já digitado; o
// register também pode voltar 429 TOO_MANY_REQUESTS com Retry-After.

const mockRegister = jest.fn();
const mockLogin = jest.fn();
let mockParams: Record<string, unknown> = {};

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), reset: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: { register: typeof mockRegister; login: typeof mockLogin }) => unknown) =>
    sel({ register: mockRegister, login: mockLogin }),
}));

jest.setTimeout(90000); // render com GluestackUIProvider e pesado sob o jest

async function cadastrar(email?: string) {
  const utils = renderWithProviders(<SignUp />);
  if (email != null) fireEvent.changeText(utils.getByPlaceholderText('E-mail'), email);
  fireEvent.changeText(utils.getByPlaceholderText('Crie uma senha'), 'Senha@123');
  fireEvent.changeText(utils.getByPlaceholderText('Confirmar senha'), 'Senha@123');
  await act(async () => {
    fireEvent.press(utils.getByTestId('primary-signup'));
  });
  return utils;
}

describe('SignUp — e-mail vindo do login/esqueci e erros de 03/10', () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => alert.mockRestore());

  it('chega com o e-mail sem conta já preenchido e cadastra com ele', async () => {
    mockParams = { email: 'semconta@vupth.com' };
    mockRegister.mockResolvedValue(undefined);

    const { getByPlaceholderText } = await cadastrar();

    expect(getByPlaceholderText('E-mail').props.value).toBe('semconta@vupth.com');
    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith('semconta@vupth.com', 'Senha@123'));
  });

  it('sem e-mail nos params, o campo começa vazio', () => {
    const { getByPlaceholderText } = renderWithProviders(<SignUp />);
    expect(getByPlaceholderText('E-mail').props.value).toBe('');
  });

  it('429: "muitas tentativas" com o tempo do Retry-After', async () => {
    mockRegister.mockRejectedValue({
      response: { status: 429, data: { code: 'TOO_MANY_REQUESTS' }, headers: { 'retry-after': '30' } },
    });

    await cadastrar('novo@vupth.com');

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Muitas tentativas', 'Muitas tentativas seguidas. Tente de novo em 30 s.'),
    );
  });

  it('outro erro: a mensagem do servidor', async () => {
    mockRegister.mockRejectedValue({ response: { status: 409, data: { message: 'E-mail já cadastrado' } } });

    await cadastrar('novo@vupth.com');

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Erro', 'E-mail já cadastrado'));
  });

  it('EMAIL_NOT_FOUND no cadastro (não esperado): cai no texto padrão', async () => {
    mockRegister.mockRejectedValue({ response: { status: 404, data: { code: 'EMAIL_NOT_FOUND' } } });

    await cadastrar('novo@vupth.com');

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Erro', 'Erro ao cadastrar'));
  });
});
