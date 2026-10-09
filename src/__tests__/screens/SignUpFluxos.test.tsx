import { Alert } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { SignUp } from '@screens/SignUp';

// cobertura-98 (09/10): o Criar conta — vindo da fila (com e sem o nome do
// profissional), o "Agora nao", senhas diferentes, os erros e o Entrar.

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockRegister = jest.fn();
const mockLogin = jest.fn();
let mockParams: Record<string, unknown> | undefined = {};

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ register: mockRegister, login: mockLogin }),
}));

jest.setTimeout(90000);

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockParams = {};
  mockRegister.mockResolvedValue(undefined);
  mockLogin.mockResolvedValue(undefined);
});

function preencher(tela: ReturnType<typeof renderWithProviders>, confirmar = 'Senha@123') {
  fireEvent.changeText(tela.getByPlaceholderText('E-mail'), 'a@b.com');
  fireEvent.changeText(tela.getByPlaceholderText('Crie uma senha'), 'Senha@123');
  fireEvent.changeText(tela.getByPlaceholderText('Confirmar senha'), confirmar);
}

describe('SignUp — de onde veio', () => {
  it('da Home: CRIAR CONTA, sem o "Agora não"', () => {
    const { getByText, queryByTestId } = renderWithProviders(<SignUp />);
    expect(getByText('CRIAR CONTA')).toBeTruthy();
    expect(queryByTestId('skip-signup')).toBeNull();
  });

  it('sem params nenhum também abre', () => {
    mockParams = undefined;
    expect(renderWithProviders(<SignUp />).getByText('CRIAR CONTA')).toBeTruthy();
  });

  it('da fila com o profissional: o nome no aviso; "Agora não" volta', () => {
    mockParams = { professionalId: 'p1', professionalName: 'Carlos' };
    const { getByText, getByTestId } = renderWithProviders(<SignUp />);
    expect(getByText('ENTRANDO NA FILA · CARLOS')).toBeTruthy();
    expect(getByText('NÃO PERCA SUA VEZ')).toBeTruthy();
    fireEvent.press(getByTestId('skip-signup'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('da fila sem o nome: o aviso genérico', () => {
    mockParams = { redirectTo: 'queueStatus' };
    expect(renderWithProviders(<SignUp />).getByText('VOCÊ ESTÁ ENTRANDO NA FILA')).toBeTruthy();
  });
});

describe('SignUp — criar', () => {
  it('cria, entra e pede o nome com o destino junto', async () => {
    mockParams = { redirectTo: 'serviceSelection', professionalId: 'p1', establishmentId: 'e1' };
    const tela = renderWithProviders(<SignUp />);
    preencher(tela);
    await act(async () => {
      fireEvent.press(tela.getByTestId('primary-signup'));
    });
    expect(mockRegister).toHaveBeenCalledWith('a@b.com', 'Senha@123');
    expect(mockReplace).toHaveBeenCalledWith('completeProfile', expect.objectContaining({ professionalId: 'p1' }));
  });

  it('senhas diferentes não criam', async () => {
    const tela = renderWithProviders(<SignUp />);
    preencher(tela, 'Outra@123');
    await act(async () => {
      fireEvent.press(tela.getByTestId('primary-signup'));
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it.each([
    [{ response: { status: 429, headers: {}, data: {} } }, 'Muitas tentativas'],
    [{ response: { status: 409, data: { message: 'E-mail já cadastrado' } } }, 'Erro'],
    [{ response: { data: { code: 'EMAIL_NOT_FOUND' } } }, 'Erro'],
  ])('erro ao criar: %#', async (erro, titulo) => {
    mockRegister.mockRejectedValue(erro);
    const tela = renderWithProviders(<SignUp />);
    preencher(tela);
    await act(async () => {
      fireEvent.press(tela.getByTestId('primary-signup'));
    });
    expect(alertSpy).toHaveBeenCalledWith(titulo, expect.any(String));
  });

  it('"Entrar" leva ao login com o destino', () => {
    mockParams = { redirectTo: 'serviceSelection', professionalId: 'p1' };
    const tela = renderWithProviders(<SignUp />);
    fireEvent.press(tela.getByTestId('go-login'));
    expect(mockNavigate).toHaveBeenCalledWith('login', expect.objectContaining({ professionalId: 'p1' }), { pop: true });
  });
});
