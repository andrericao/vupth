import { act, fireEvent, waitFor } from '@testing-library/react-native';

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

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
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
jest.setTimeout(30000);

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
