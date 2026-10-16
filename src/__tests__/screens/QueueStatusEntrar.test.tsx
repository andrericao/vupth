import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';

// cobertura-98 (08/10): entrar na fila — o servidor sem acordar, a loja fechada
// com o "Solicitar corte", a fila fechada do profissional e os outros erros.

const mockGoBack = jest.fn();
const mockLeave = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockCutCreate = jest.fn();
const mockAdicionar = jest.fn();
const mockWait = jest.fn();
const mockJoin = jest.fn();
const mockHistorico = jest.fn();
let mockParams: Record<string, unknown> = {};

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn().mockResolvedValue('1'), setItemAsync: jest.fn() }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/ofertaDePush', () => ({ podeOferecerPush: () => Promise.resolve(false) }));
jest.mock('@hooks/useMostraPosicao', () => ({ useMostraPosicao: () => true }));
jest.mock('@hooks/useQueueCountdown', () => ({
  useQueueCountdown: () => ({
    remaining: null, semPrevisao: true, elapsedSeconds: 0, color: '#163300',
    isInQueue: false, isBeingAttended: false, isPaused: false, isFinished: false,
    refresh: jest.fn(), activeQueue: null,
  }),
}));
jest.mock('@hooks/useSwapOffers', () => ({ useSwapOffers: () => ({ data: [] }) }));
jest.mock('@services/healthService', () => ({ waitForBackend: (...a: unknown[]) => mockWait(...a) }));
jest.mock('@services/attendanceService', () => ({
  attendanceService: { create: (...a: unknown[]) => mockCreate(...a), listClientHistory: (...a: unknown[]) => mockHistorico(...a) },
}));
jest.mock('@services/cutRequestService', () => ({
  cutRequestService: { create: (...a: unknown[]) => mockCutCreate(...a) },
}));
jest.mock('@stores/pedidoDeCorteStore', () => ({
  usePedidoDeCorteStore: { getState: () => ({ adicionar: (...a: unknown[]) => mockAdicionar(...a) }) },
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk', user: { id: 'u1' } }),
}));
jest.mock('@stores/ratedStore', () => ({ useRatedStore: (sel: (s: unknown) => unknown) => sel({ ids: [] }) }));
jest.mock('@stores/queueStore', () => {
  const estado = { leaveQueue: () => mockLeave(), updateQueue: (...a: unknown[]) => mockUpdate(...a) };
  const useQueueStore = (sel: (s: unknown) => unknown) => sel(estado);
  useQueueStore.getState = () => ({ ...estado, joinQueue: (...a: unknown[]) => mockJoin(...a), activeQueue: null });
  return { useQueueStore };
});
jest.mock('@components/SwapOffersModal', () => ({ SwapOffersModal: () => null }));
jest.mock('@components/ChangeTurnModal', () => ({ ChangeTurnModal: () => null }));
jest.mock('@components/RescheduleModal', () => ({ RescheduleModal: () => null }));
jest.mock('@components/RatingModal', () => ({ RatingModal: () => null }));
jest.mock('@components/QueueDisclaimerModal', () => ({ QueueDisclaimerModal: () => null }));

jest.setTimeout(60000);

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockParams = {
    professionalId: 'p1',
    professionalName: 'Carlos',
    establishmentId: 'e1',
    establishmentName: 'Barbearia',
    serviceItemIds: ['s1'],
  };
  mockWait.mockResolvedValue(true);
  mockCreate.mockResolvedValue({ data: { id: 'a9' } });
  mockCutCreate.mockResolvedValue({ data: { id: 'c1', status: 'PENDING', expiresAt: null } });
  mockAdicionar.mockResolvedValue(undefined);
});

const lojaFechada = { response: { status: 409, data: { code: 'ESTABLISHMENT_NOT_OPEN' } } };

describe('QueueStatus — entrar na fila', () => {
  it('entra: cria o atendimento e guarda o id', async () => {
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ attendanceId: 'a9' }));
    expect(mockCreate.mock.calls[0][0]).toHaveProperty('scheduledTime');
  });

  it('agendar manda o horário pedido', async () => {
    mockParams.targetTime = '2026-10-08T18:00:00.000Z';
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate.mock.calls[0][0]).toHaveProperty('targetTime', '2026-10-08T18:00:00.000Z');
  });

  it('o servidor sem acordar: limpa a fila e diz para tentar de novo', async () => {
    mockWait.mockResolvedValue(false);
    const { findByText } = renderWithProviders(<QueueStatus />);
    expect(await findByText(/Não conseguimos conectar agora/)).toBeTruthy();
    expect(mockLeave).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('a fila fechada do profissional avisa e volta no "Entendi"', async () => {
    mockCreate.mockRejectedValue({ response: { status: 409, data: { code: 'PROFESSIONAL_NOT_ACCEPTING_NEW' } } });
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Fila fechada', expect.any(String), expect.any(Array)));
    const botoes = alertSpy.mock.calls[0][2] as { onPress: () => void }[];
    botoes[0].onPress();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('outro erro mostra a mensagem do servidor', async () => {
    mockCreate.mockRejectedValue({ response: { status: 500, data: { message: 'Falhou' } } });
    const { findByText } = renderWithProviders(<QueueStatus />);
    expect(await findByText('Falhou')).toBeTruthy();
  });

  it('erro sem mensagem usa a do erro, ou a padrão', async () => {
    mockCreate.mockRejectedValue({});
    const { findByText } = renderWithProviders(<QueueStatus />);
    expect(await findByText('Erro ao entrar na fila')).toBeTruthy();
  });

  it('agendamento recusado explica pelo código', async () => {
    mockParams.targetTime = '2026-10-08T18:00:00.000Z';
    mockCreate.mockRejectedValue({ response: { status: 422, data: { code: 'X' } } });
    const { findByText } = renderWithProviders(<QueueStatus />);
    expect(await findByText('Voltar')).toBeTruthy();
  });

  it('"Voltar" na tela de erro limpa a fila e volta', async () => {
    mockCreate.mockRejectedValue({ response: { status: 500, data: { message: 'Falhou' } } });
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('Voltar'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

describe('QueueStatus — loja fechada: Solicitar corte', () => {
  it('oferece o pedido de corte, envia, guarda e volta', async () => {
    mockCreate.mockRejectedValue(lojaFechada);
    const { findByText } = renderWithProviders(<QueueStatus />);
    const botao = await findByText('Solicitar corte');
    await act(async () => {
      fireEvent.press(botao);
    });
    await waitFor(() => expect(mockCutCreate).toHaveBeenCalledWith(
      { professionalId: 'p1', establishmentId: 'e1', serviceItemIds: ['s1'] },
      'tk',
    ));
    await waitFor(() => expect(mockAdicionar).toHaveBeenCalled());
    expect(alertSpy).toHaveBeenLastCalledWith('Pedido enviado! ⏳', expect.any(String));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('sem os nomes na rota, o pedido vai com texto vazio', async () => {
    mockParams = { professionalId: 'p1', establishmentId: 'e1', serviceItemIds: ['s1'] };
    mockCreate.mockRejectedValue(lojaFechada);
    const { findByText } = renderWithProviders(<QueueStatus />);
    const botao = await findByText('Solicitar corte');
    await act(async () => {
      fireEvent.press(botao);
    });
    await waitFor(() => expect(mockAdicionar).toHaveBeenCalled());
  });

  it('o 409 antigo diz que a loja está aberta', async () => {
    mockCreate.mockRejectedValue(lojaFechada);
    mockCutCreate.mockRejectedValue({ response: { data: { code: 'CUT_REQUEST_NOT_ALLOWED' } } });
    const { findByText } = renderWithProviders(<QueueStatus />);
    const botao = await findByText('Solicitar corte');
    await act(async () => {
      fireEvent.press(botao);
    });
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Erro', expect.stringContaining('aberta')));
  });

  it('outro erro mostra a mensagem do servidor, ou a padrão', async () => {
    mockCreate.mockRejectedValue(lojaFechada);
    mockCutCreate.mockRejectedValueOnce({ response: { data: { message: 'Limite' } } });
    const { findByText } = renderWithProviders(<QueueStatus />);
    const botao = await findByText('Solicitar corte');
    await act(async () => {
      fireEvent.press(botao);
    });
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'Limite'));

    mockCutCreate.mockRejectedValueOnce(new Error('x'));
    const botao2 = await findByText('Solicitar corte');
    await act(async () => {
      fireEvent.press(botao2);
    });
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'Erro ao enviar o pedido de corte'));
  });
});

describe('QueueStatus — o que sobra ao entrar (cobertura-98)', () => {
  const jaNaFila = { response: { status: 409, data: { code: 'CLIENT_ALREADY_IN_QUEUE' } } };

  async function noAvisoJaNaFila() {
    mockCreate.mockRejectedValue(jaNaFila);
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Você já está na fila', expect.any(String), expect.any(Array)));
    return alertSpy.mock.calls[0][2] as { text: string; onPress: () => Promise<void> | void }[];
  }

  it('já na fila: "Voltar" volta', async () => {
    const [voltar] = await noAvisoJaNaFila();
    voltar.onPress();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('já na fila: "Ver minha fila" acha o atendimento no histórico e abre a fila', async () => {
    mockHistorico.mockResolvedValue({
      data: [{ id: 'a7', professionalId: 'p1', establishmentId: 'e1', status: 'SCHEDULED', scheduledTime: new Date().toISOString(), services: [] }],
    });
    const [, ver] = await noAvisoJaNaFila();
    await act(async () => {
      await ver.onPress();
    });
    expect(mockJoin).toHaveBeenCalledWith(expect.objectContaining({ attendanceId: 'a7' }));
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('já na fila: sem o atendimento no histórico (ou sem rede), volta', async () => {
    mockHistorico.mockResolvedValueOnce({ data: null }).mockRejectedValueOnce(new Error('rede'));
    const [, ver] = await noAvisoJaNaFila();
    await act(async () => {
      await ver.onPress();
    });
    await act(async () => {
      await ver.onPress();
    });
    expect(mockGoBack).toHaveBeenCalledTimes(2);
  });

  it('horário que caiu no intervalo: avisa o ajuste', async () => {
    mockCreate.mockResolvedValue({ data: { id: 'a9', placedAfterBreak: true, scheduledTime: null } });
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Horário ajustado', expect.stringMatching(/logo depois dele/)));
    const { isCancelled } = mockWait.mock.calls[0][0] as { isCancelled: () => boolean };
    expect(isCancelled()).toBe(false);
  });
});

describe('QueueStatus — pagamento pendente (CLI-30)', () => {
  it('409 PAYMENT_PENDING: limpa a fila, mostra o aviso com o "Pagar" e volta', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { usePendenciaStore } = require('@stores/pendenciaStore');
    const itens = [{ attendance_id: 'a0', status: 'PENDING', amount: 45 }];
    mockCreate.mockRejectedValue({ response: { status: 409, data: { code: 'PAYMENT_PENDING', items: itens } } });
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(usePendenciaStore.getState().aviso).toEqual(itens));
    expect(mockLeave).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
    usePendenciaStore.getState().fechar();
  });
});

describe('QueueStatus — tela de erro (cobertura-98)', () => {
  it('o voltar do cabeçalho volta', async () => {
    mockCreate.mockRejectedValue({ response: { status: 500, data: { message: 'Falhou' } } });
    const { findByText, getByTestId } = renderWithProviders(<QueueStatus />);
    await findByText('Falhou');
    fireEvent.press(getByTestId('back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

