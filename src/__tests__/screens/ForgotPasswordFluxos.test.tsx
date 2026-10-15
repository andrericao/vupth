import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { ForgotPassword } from '@screens/ForgotPassword';

// cobertura-98 (08/10): esqueci a senha — o servidor sem acordar, o timeout do
// envio, os erros do envio, o reenviar e o redefinir com os erros.

const mockNavigate = jest.fn();
const mockWait = jest.fn();
const mockForgot = jest.fn();
const mockReset = jest.fn();

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('@services/healthService', () => ({ waitForBackend: (...a: unknown[]) => mockWait(...a) }));
jest.mock('@services/authService', () => ({
  authService: {
    forgotPassword: (...a: unknown[]) => mockForgot(...a),
    resetPassword: (...a: unknown[]) => mockReset(...a),
  },
}));

jest.setTimeout(90000);

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockWait.mockResolvedValue(true);
  mockForgot.mockResolvedValue({});
  mockReset.mockResolvedValue({});
});

async function enviar() {
  const tela = renderWithProviders(<ForgotPassword />);
  fireEvent.changeText(tela.getByPlaceholderText('E-mail'), 'cliente@vupth.com');
  await act(async () => {
    fireEvent.press(tela.getByTestId('forgot-send'));
  });
  return tela;
}

async function noPassoDoCodigo() {
  const tela = await enviar();
  await tela.findByPlaceholderText('Código de 6 dígitos');
  return tela;
}

function preencherReset(tela: ReturnType<typeof renderWithProviders>) {
  fireEvent.changeText(tela.getByPlaceholderText('Código de 6 dígitos'), '123456');
  fireEvent.changeText(tela.getByPlaceholderText('Nova senha'), 'Senha@123');
  fireEvent.changeText(tela.getByPlaceholderText('Confirmar nova senha'), 'Senha@123');
}

describe('ForgotPassword — enviar o código', () => {
  it('o servidor sem acordar avisa e não envia', async () => {
    mockWait.mockResolvedValue(false);
    await enviar();
    expect(alertSpy).toHaveBeenCalledWith('Sem conexão agora', expect.any(String));
    expect(mockForgot).not.toHaveBeenCalled();
  });

  it('timeout do envio segue para o passo do código', async () => {
    mockForgot.mockRejectedValue({ code: 'ECONNABORTED' });
    const tela = await enviar();
    expect(alertSpy).toHaveBeenCalledWith('O envio demorou para confirmar', expect.any(String));
    expect(await tela.findByPlaceholderText('Código de 6 dígitos')).toBeTruthy();
  });

  it('e-mail sem conta oferece criar a conta com o e-mail', async () => {
    mockForgot.mockRejectedValue({ response: { status: 404, data: { code: 'EMAIL_NOT_FOUND' } } });
    await enviar();
    const botoes = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    botoes[1].onPress!();
    expect(mockNavigate).toHaveBeenCalledWith('signUp', { email: 'cliente@vupth.com' }, { pop: true });
  });

  it('muitas tentativas', async () => {
    mockForgot.mockRejectedValue({ response: { status: 429, headers: {}, data: {} } });
    await enviar();
    expect(alertSpy).toHaveBeenCalledWith('Muitas tentativas', expect.any(String));
  });

  it('outro erro', async () => {
    mockForgot.mockRejectedValue({ response: { status: 500, data: { message: 'Falhou' } } });
    await enviar();
    expect(alertSpy).toHaveBeenCalledWith('Erro', 'Falhou');
  });

  it('reenviar o código avisa', async () => {
    const tela = await noPassoDoCodigo();
    await act(async () => {
      fireEvent.press(tela.getByText('Reenviar código'));
    });
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Código reenviado', expect.any(String)));
  });
});

describe('ForgotPassword — redefinir', () => {
  it('redefine e leva ao Entrar', async () => {
    const tela = await noPassoDoCodigo();
    preencherReset(tela);
    await act(async () => {
      fireEvent.press(tela.getByText('Redefinir senha'));
    });
    expect(mockReset).toHaveBeenCalledWith('cliente@vupth.com', '123456', 'Senha@123');
    expect(alertSpy).toHaveBeenCalledWith('Senha redefinida', expect.any(String));
    expect(mockNavigate).toHaveBeenCalledWith('login', {}, { pop: true });
  });

  it.each([
    [{ response: { data: { code: 'RESET_CODE_INVALID' } } }, /Código inválido/],
    [{ response: { data: { code: 'RESET_CODE_EXPIRED' } } }, /Código expirado/],
    [{ response: { data: { message: 'Falhou' } } }, /Falhou/],
    [new Error('Network Error'), /Network Error/],
    [{}, /Erro ao redefinir a senha/],
  ])('erro ao redefinir: %#', async (erro, texto) => {
    mockReset.mockRejectedValue(erro);
    const tela = await noPassoDoCodigo();
    preencherReset(tela);
    await act(async () => {
      fireEvent.press(tela.getByText('Redefinir senha'));
    });
    expect(alertSpy).toHaveBeenLastCalledWith('Erro', expect.stringMatching(texto));
  });
});
