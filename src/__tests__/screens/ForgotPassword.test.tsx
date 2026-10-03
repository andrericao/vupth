import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { ForgotPassword } from '@screens/ForgotPassword';
import { waitForBackend } from '@services/healthService';
import { authService } from '@services/authService';

// Regressão real (feedback device Andre 2026-08-05): no passo 1 o botão
// "Enviar código" ficava carregando "e nada". A causa era o portão de readiness
// com 60s de timeout POR TENTATIVA — com o Render hibernado a 1ª cutucada penava
// ~50s antes de a tela ter qualquer coisa a dizer, e não havia saída.
// Este teste fixa o contrato do conserto: tentativas curtas, aviso de que a
// espera é o servidor acordando, e uma desistência que NÃO dispara o POST.

const mockNavigate = jest.fn();

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// Mock PARCIAL, de proposito. Substituir o modulo inteiro derruba quem depende
// das outras exportacoes: o `useTabBarInset` importa
// `@react-navigation/bottom-tabs`, que chama `createNavigatorFactory` daqui —
// sem o requireActual a suite nem chega a rodar, com
// `(0, _native.createNavigatorFactory) is not a function`.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('@services/healthService', () => ({ waitForBackend: jest.fn() }));
jest.mock('@services/authService', () => ({
  authService: { forgotPassword: jest.fn(), resetPassword: jest.fn() },
}));

const mockWaitForBackend = waitForBackend as jest.Mock;
const mockForgotPassword = authService.forgotPassword as jest.Mock;

type GateOptions = Parameters<typeof waitForBackend>[0];

// Render de tela com GluestackUIProvider é pesado sob o jest (a 1ª montagem
// carrega o build inteiro do gluestack).
jest.setTimeout(90000); // ver ServiceSelection.test.tsx: 30s caiu por carga da maquina, nao por regressao (19/09)

describe('ForgotPassword — passo 1 (enviar código)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function renderAndSend() {
    const utils = renderWithProviders(<ForgotPassword />);
    fireEvent.changeText(utils.getByPlaceholderText('E-mail'), 'cliente@vupth.com');
    await act(async () => {
      fireEvent.press(utils.getByTestId('forgot-send'));
    });
    return utils;
  }

  it('pede o portão de readiness com tentativas curtas e cancelável', async () => {
    mockWaitForBackend.mockResolvedValue(true);
    mockForgotPassword.mockResolvedValue({ data: {} });

    await renderAndSend();

    const opts = mockWaitForBackend.mock.calls[0][0] as NonNullable<GateOptions>;
    // 60s (o default) deixava a tela muda por quase um minuto.
    expect(opts.perAttemptMs).toBeLessThanOrEqual(10000);
    expect(typeof opts.isCancelled).toBe('function');
  });

  it('avisa que o servidor está acordando enquanto o portão não responde', async () => {
    // Portão pendurado = exatamente o cold start do Render.
    mockWaitForBackend.mockImplementation(() => new Promise(() => {}));

    const { findByText } = await renderAndSend();

    // O aviso só aparece depois de alguns segundos: servidor quente responde
    // na hora e não deve piscar "acordando".
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(await findByText(/Acordando o servidor/)).toBeTruthy();
  });

  it('cancelar a espera não dispara o POST de esqueci-senha', async () => {
    let releaseGate: (() => void) | undefined;
    let gateOpts: NonNullable<GateOptions> | undefined;
    mockWaitForBackend.mockImplementation((opts: NonNullable<GateOptions>) => {
      gateOpts = opts;
      // Espelha o healthService real: ao ser cancelado, devolve `false`.
      return new Promise<boolean>((resolve) => {
        releaseGate = () => resolve(!opts.isCancelled?.());
      });
    });

    const { getByTestId } = await renderAndSend();

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    await act(async () => {
      fireEvent.press(getByTestId('forgot-cancel-wait'));
    });
    expect(gateOpts?.isCancelled?.()).toBe(true);

    await act(async () => {
      releaseGate?.();
    });

    await waitFor(() => {
      expect(mockForgotPassword).not.toHaveBeenCalled();
    });
  });

  it('servidor pronto: envia o código e avança para o passo do código', async () => {
    mockWaitForBackend.mockResolvedValue(true);
    mockForgotPassword.mockResolvedValue({ data: {} });

    const { findByPlaceholderText } = await renderAndSend();

    expect(mockForgotPassword).toHaveBeenCalledWith('cliente@vupth.com');
    expect(await findByPlaceholderText('Código de 6 dígitos')).toBeTruthy();
  });
});

describe('ForgotPassword — e-mail sem conta e muitas tentativas (Backend, 03/10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWaitForBackend.mockResolvedValue(true);
  });

  async function renderAndSend() {
    const utils = renderWithProviders(<ForgotPassword />);
    fireEvent.changeText(utils.getByPlaceholderText('E-mail'), ' semconta@vupth.com ');
    await act(async () => {
      fireEvent.press(utils.getByTestId('forgot-send'));
    });
    return utils;
  }

  it('404 EMAIL_NOT_FOUND: avisa, não vai para o passo do código e oferece o cadastro', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockForgotPassword.mockRejectedValue({ response: { status: 404, data: { code: 'EMAIL_NOT_FOUND' } } });

    const { queryByPlaceholderText } = await renderAndSend();

    await waitFor(() => expect(alert).toHaveBeenCalled());
    const [titulo, , botoes] = alert.mock.calls[0];
    expect(titulo).toBe('E-mail sem conta');
    expect(queryByPlaceholderText('Código de 6 dígitos')).toBeNull();

    const criar = (botoes as { text: string; onPress?: () => void }[]).find((b) => b.text === 'Criar conta');
    criar?.onPress?.();
    expect(mockNavigate).toHaveBeenCalledWith('signUp', { email: 'semconta@vupth.com' });
    alert.mockRestore();
  });

  it('429: "muitas tentativas" com o tempo do Retry-After', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockForgotPassword.mockRejectedValue({
      response: { status: 429, data: { code: 'TOO_MANY_REQUESTS' }, headers: { 'retry-after': '45' } },
    });

    await renderAndSend();

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Muitas tentativas', 'Muitas tentativas seguidas. Tente de novo em 45 s.'),
    );
    alert.mockRestore();
  });

  it('outro erro: a mensagem do servidor', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockForgotPassword.mockRejectedValue({ response: { status: 500, data: { message: 'Falhou' } } });

    await renderAndSend();

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Erro', 'Falhou'));
    alert.mockRestore();
  });
});
