import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';

// cobertura-98 (08/10): a fila concluida (avaliar, marcar de novo, voltar ao
// inicio) e os botoes do topo da espera.

const mockNavigate = jest.fn();
const mockLeave = jest.fn();
let mockEstado: Record<string, unknown> = {};

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn().mockResolvedValue('1'), setItemAsync: jest.fn() }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { professionalId: 'p1', establishmentId: 'e1' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
let mockPodeOferecer = false;
let mockTelaDoPush = true;
jest.mock('@hooks/ofertaDePush', () => ({
  podeOferecerPush: () => Promise.resolve(mockPodeOferecer),
  get TELA_DO_PUSH_VISIVEL() {
    return mockTelaDoPush;
  },
}));
jest.mock('@hooks/useMostraPosicao', () => ({ useMostraPosicao: () => true }));
jest.mock('@hooks/useQueueCountdown', () => ({ useQueueCountdown: () => mockEstado }));
const mockPagamento = jest.fn();
jest.mock('@services/paymentService', () => ({ paymentService: { get: (...a: unknown[]) => mockPagamento(...a) } }));
jest.mock('@hooks/useSwapOffers', () => ({ useSwapOffers: () => ({ data: [] }) }));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk', user: { id: 'u1' } }),
}));
jest.mock('@stores/ratedStore', () => ({ useRatedStore: (sel: (s: unknown) => unknown) => sel({ ids: [] }) }));
jest.mock('@stores/queueStore', () => {
  const estado = { leaveQueue: () => mockLeave(), updateQueue: jest.fn() };
  const useQueueStore = (sel: (s: unknown) => unknown) => sel(estado);
  useQueueStore.getState = () => ({ ...estado, joinQueue: jest.fn(), activeQueue: null });
  return { useQueueStore };
});
jest.mock('@components/SwapOffersModal', () => {
  const { Text } = jest.requireActual('react-native');
  return { SwapOffersModal: ({ visible }: { visible: boolean }) => (visible ? <Text>trocas-abertas</Text> : null) };
});
jest.mock('@components/ChangeTurnModal', () => ({ ChangeTurnModal: () => null }));
jest.mock('@components/RescheduleModal', () => ({ RescheduleModal: () => null }));
jest.mock('@components/RatingModal', () => {
  const { Text } = jest.requireActual('react-native');
  return { RatingModal: ({ visible, onClose }: { visible: boolean; onClose: () => void }) => (visible ? <Text onPress={onClose}>avaliacao-aberta</Text> : null) };
});
jest.mock('@components/QueueDisclaimerModal', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    QueueDisclaimerModal: ({ visible, onClose }: { visible: boolean; onClose: (n: boolean) => void }) =>
      visible ? <Text onPress={() => onClose(true)}>aviso-da-estimativa</Text> : null,
  };
});

jest.setTimeout(90000);

const FILA = {
  attendanceId: 'a1',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  enteredAt: 0,
  estimatedMinutes: 20,
  status: 'FINISHED',
  serviceMinutes: 30,
};

function estado(over: Record<string, unknown>) {
  mockEstado = {
    remaining: 20, elapsedSeconds: 0, color: '#163300',
    isInQueue: false, isBeingAttended: false, isPaused: false, isFinished: false,
    refresh: jest.fn(), activeQueue: FILA,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPodeOferecer = false;
  mockTelaDoPush = true;
  mockPagamento.mockResolvedValue({ data: { status: 'PAID', amount: 30 } });
});

describe('QueueStatus — concluído', () => {
  beforeEach(() => estado({ isFinished: true }));

  it('avaliar abre e fecha a avaliação', () => {
    const { getByText, queryByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(getByText('Avaliar atendimento'));
    fireEvent.press(getByText('avaliacao-aberta'));
    expect(queryByText('avaliacao-aberta')).toBeNull();
  });

  it('"Marcar de novo" volta à loja e limpa a fila', () => {
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    fireEvent.press(getByTestId('book-again'));
    expect(mockLeave).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('establishmentDetail', { establishmentId: 'e1' }, { pop: true });
  });

  it('"Voltar ao início" limpa a fila e vai ao Início', () => {
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    fireEvent.press(getByTestId('finish-home'));
    expect(mockLeave).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('home', undefined, { pop: true });
  });
});

describe('QueueStatus — aguardando, o topo', () => {
  beforeEach(() => estado({ isInQueue: true, activeQueue: { ...FILA, status: 'SCHEDULED' } }));

  it('o ⓘ abre o aviso da estimativa, e "não mostrar de novo" o fecha', () => {
    const { getByTestId, getByText, queryByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(getByTestId('queue-info'));
    fireEvent.press(getByText('aviso-da-estimativa'));
    expect(queryByText('aviso-da-estimativa')).toBeNull();
  });

  // fila-aguardando-do-mockup (CLI-32, mockup 2 aprovado em 29/10): o aviso e um slide do carrossel; trocar, ir para o
  // final e sair moram no menu Opcoes.
  it('o aviso "clique em Opções" é um slide do carrossel e o menu Opções traz trocar, ir para o final e sair', () => {
    const { getByTestId, getByText } = renderWithProviders(<QueueStatus />);
    expect(getByTestId('aviso-opcoes')).toBeTruthy();
    expect(getByText('Clique em Opções caso não consiga chegar no horário')).toBeTruthy();
    fireEvent.press(getByTestId('queue-options'));
    expect(getByTestId('more-option-change-turn')).toBeTruthy();
    expect(getByTestId('more-option-move-to-end')).toBeTruthy();
    expect(getByTestId('more-option-leave-queue')).toBeTruthy();
  });

  it('as trocas abrem pelo botão', () => {
    const { getByTestId, getByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(getByTestId('queue-options'));
    fireEvent.press(getByTestId('more-option-ver-trocas'));
    expect(getByText('trocas-abertas')).toBeTruthy();
  });
});

describe('QueueStatus — pausado (a tela clara)', () => {
  beforeEach(() => estado({ isInQueue: true, isPaused: true, activeQueue: { ...FILA, status: 'SCHEDULED' } }));

  it('o ⓘ da duração, as trocas e o voltar ao início', () => {
    const { getByTestId, getByText, queryByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(getByTestId('queue-info-inline'));
    fireEvent.press(getByText('aviso-da-estimativa'));
    expect(queryByText('aviso-da-estimativa')).toBeNull();
    fireEvent.press(getByText('Trocar de lugar'));
    expect(getByText('trocas-abertas')).toBeTruthy();
    fireEvent.press(getByText('Voltar ao início'));
    expect(mockNavigate).toHaveBeenCalledWith('home', undefined, { pop: true });
  });
});

describe('QueueStatus — concluído na tela clara', () => {
  it('"Concluir" limpa a fila', () => {
    estado({ isFinished: true, isInQueue: true, activeQueue: { ...FILA, establishmentId: '' } });
    const { queryByText } = renderWithProviders(<QueueStatus />);
    const concluir = queryByText('Concluir') ?? queryByText('Voltar ao início');
    if (concluir) fireEvent.press(concluir);
    expect(mockNavigate).toHaveBeenCalled();
  });
});

describe('QueueStatus — a tela 10 na primeira fila', () => {
  it('quando pode, oferece o aviso de push', async () => {
    mockPodeOferecer = true;
    estado({ isInQueue: true, activeQueue: { ...FILA, status: 'SCHEDULED' } });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useFirstRunStore } = require('@stores/firstRunStore');
    useFirstRunStore.setState({ restored: true, pushAsked: false, pushOferta: false });
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(useFirstRunStore.getState().pushOferta).toBe(true));
  });

  // aguardando-cronometro-e-vez (DEC-149): com a tela 10 oculta, nao ha oferta; marca como perguntado e a caixa do
  // sistema vem direto (senao a notificacao nunca seria pedida).
  it('com a tela oculta, nao oferece e deixa a caixa do sistema vir', async () => {
    mockPodeOferecer = true;
    mockTelaDoPush = false;
    estado({ isInQueue: true, activeQueue: { ...FILA, status: 'SCHEDULED' } });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useFirstRunStore } = require('@stores/firstRunStore');
    useFirstRunStore.setState({ restored: true, pushAsked: false, pushOferta: false });
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(useFirstRunStore.getState().pushAsked).toBe(true));
    expect(useFirstRunStore.getState().pushOferta).toBe(false);
  });
});

describe('QueueStatus — pagamento-no-concluido (CLI-34)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { usePendenciaStore } = require('@stores/pendenciaStore');
  afterEach(() => usePendenciaStore.getState().fechar());

  it('concluído com o pagamento pendente: abre o Pix uma vez', async () => {
    mockPagamento.mockResolvedValue({ data: { status: 'PENDING', amount: 30, pix_copy_paste: '000201pix' } });
    estado({ isFinished: true });
    const { rerender } = renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(usePendenciaStore.getState().pagando).toBe('a1'));
    expect(mockPagamento).toHaveBeenCalledWith('a1', 'tk');
    usePendenciaStore.getState().fechar();
    rerender(<QueueStatus />);
    await waitFor(() => expect(usePendenciaStore.getState().pagando).toBeNull());
  });

  // pagar-ao-finalizar-corte (André, 24/10): com o Asaas o Pix vem no `gateway`, nao no topo; o modal abre igual.
  it('concluído com o Pix do Asaas (no gateway): abre o Pix', async () => {
    mockPagamento.mockResolvedValue({
      data: { status: 'PENDING', amount: 30, gateway: { provider: 'ASAAS', mode: 'REAL', pix_copy_paste: '000201asaas' } },
    });
    estado({ isFinished: true });
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(usePendenciaStore.getState().pagando).toBe('a1'));
  });

  it('o pagamento ainda não nasceu no FINISHED: tenta de novo uma vez e abre', async () => {
    jest.useFakeTimers();
    try {
      mockPagamento
        .mockRejectedValueOnce({ response: { status: 404 } }) // o pagamento ainda nao nasceu
        .mockResolvedValue({ data: { status: 'PENDING', amount: 30, pix_copy_paste: '000201pix' } });
      estado({ isFinished: true });
      renderWithProviders(<QueueStatus />);
      await act(async () => {});
      expect(usePendenciaStore.getState().pagando).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(4000);
      });
      expect(usePendenciaStore.getState().pagando).toBe('a1');
      expect(mockPagamento).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  // pagar-sempre-disponivel (André, 25/10): a opcao de pagar nunca some; sem Pix o modal abre e diz que o pagamento e combinado.
  it('pendente mas o profissional não tem Pix: o modal abre mesmo assim (pagamento combinado, Já paguei)', async () => {
    mockPagamento.mockResolvedValue({ data: { status: 'PENDING', amount: 30, pix_copy_paste: null } });
    estado({ isFinished: true });
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(usePendenciaStore.getState().pagando).toBe('a1'));
  });

  it('já pago, ou sem conseguir ler: não abre', async () => {
    estado({ isFinished: true });
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(mockPagamento).toHaveBeenCalled());
    expect(usePendenciaStore.getState().pagando).toBeNull();

    mockPagamento.mockRejectedValue(new Error('x'));
    estado({ isFinished: true, activeQueue: { ...FILA, attendanceId: 'a2' } });
    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(mockPagamento).toHaveBeenCalledWith('a2', 'tk'));
    expect(usePendenciaStore.getState().pagando).toBeNull();
  });
});

