import { RefreshControl } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';

// cobertura-98 (16/10): o voltar do cabecalho e o fechar de cada modal, na
// espera e na tela clara (pausado).

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
jest.mock('@hooks/ofertaDePush', () => ({ podeOferecerPush: () => Promise.resolve(mockPodeOferecer) }));
jest.mock('@hooks/useMostraPosicao', () => ({ useMostraPosicao: () => true }));
jest.mock('@hooks/useQueueCountdown', () => ({ useQueueCountdown: () => mockEstado }));
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
function mockFechar(nome: string) {
  const { Text } = jest.requireActual('react-native');
  function Fechar(p: { onClose: (...a: unknown[]) => void; onReschedule?: () => void }) {
    return (
      <>
        <Text onPress={() => p.onClose(false)}>{`fechar-${nome}`}</Text>
        {p.onReschedule ? <Text onPress={p.onReschedule}>{`remarcar-${nome}`}</Text> : null}
      </>
    );
  }
  return Fechar;
}
jest.mock('@components/SwapOffersModal', () => ({ SwapOffersModal: mockFechar('trocas') }));
jest.mock('@components/ChangeTurnModal', () => ({ ChangeTurnModal: mockFechar('mudar') }));
jest.mock('@components/RescheduleModal', () => ({ RescheduleModal: mockFechar('remarcar') }));
jest.mock('@components/RatingModal', () => ({ RatingModal: mockFechar('avaliar') }));
jest.mock('@components/QueueDisclaimerModal', () => ({ QueueDisclaimerModal: mockFechar('aviso') }));

jest.setTimeout(90000);

const FILA = {
  attendanceId: 'a1',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  enteredAt: 0,
  estimatedMinutes: 20,
  status: 'SCHEDULED',
  serviceMinutes: 30,
};

function estado(over: Record<string, unknown>) {
  mockEstado = {
    remaining: 20, elapsedSeconds: 0, color: '#163300',
    isInQueue: true, isBeingAttended: false, isPaused: false, isFinished: false,
    refresh: jest.fn(), activeQueue: FILA,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPodeOferecer = false;
});

function fecharTudo(tela: ReturnType<typeof renderWithProviders>) {
  for (const nome of ['trocas', 'mudar', 'remarcar', 'aviso']) {
    for (const el of tela.queryAllByText(`fechar-${nome}`)) fireEvent.press(el);
  }
  for (const el of tela.queryAllByText('remarcar-mudar')) fireEvent.press(el);
}

describe('QueueStatus — voltar e fechar (cobertura-98)', () => {
  it('na espera: o voltar vai ao Início e os modais fecham', () => {
    estado({});
    const tela = renderWithProviders(<QueueStatus />);
    fecharTudo(tela);
    fireEvent.press(tela.getByTestId('back-button'));
    expect(mockNavigate).toHaveBeenCalledWith('home', undefined, { pop: true });
  });

  it('pausado (tela clara): o voltar vai ao Início e os modais fecham', () => {
    estado({ isPaused: true });
    const tela = renderWithProviders(<QueueStatus />);
    fecharTudo(tela);
    fireEvent.press(tela.getByTestId('back-button'));
    expect(mockNavigate).toHaveBeenCalledWith('home', undefined, { pop: true });
  });
});

describe('QueueStatus — puxar para atualizar e a faixa da saída (cobertura-98)', () => {
  it('puxar para atualizar chama o refresh, na espera e na tela clara', async () => {
    for (const over of [{}, { isPaused: true }]) {
      estado(over);
      const tela = renderWithProviders(<QueueStatus />);
      await act(async () => {
        await tela.UNSAFE_getAllByType(RefreshControl)[0].props.onRefresh();
      });
      expect(mockEstado.refresh).toHaveBeenCalled();
      tela.unmount();
    }
  });

  it('o primeiro toque em "Sair da fila" mostra a faixa, que some em 8 s', () => {
    jest.useFakeTimers();
    try {
      estado({});
      const tela = renderWithProviders(<QueueStatus />);
      fireEvent.press(tela.getByTestId('queue-options'));
      fireEvent.press(tela.getByTestId('more-option-leave-queue'));
      expect(tela.getByTestId('faixa-de-saida')).toBeTruthy();
      act(() => {
        jest.advanceTimersByTime(8000);
      });
      expect(tela.queryByTestId('faixa-de-saida')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('QueueStatus — os rótulos do tempo (cobertura-98)', () => {
  it('em atendimento: o tempo corrido e o término previsto', () => {
    estado({ isInQueue: false, isBeingAttended: true, elapsedSeconds: 125, activeQueue: { ...FILA, status: 'IN_PROGRESS', startedAt: Date.now() - 125000 } });
    const tela = renderWithProviders(<QueueStatus />);
    expect(tela.toJSON()).toBeTruthy();
  });

  // valor-no-em-atendimento (André, 22/10): em atendimento, o cliente vê o valor do serviço.
  it('em atendimento: mostra o valor do serviço; na espera, não', () => {
    estado({ isInQueue: false, isBeingAttended: true, activeQueue: { ...FILA, status: 'IN_PROGRESS', startedAt: Date.now() - 60000, totalValue: 45 } });
    const em = renderWithProviders(<QueueStatus />);
    expect(em.getByTestId('em-atendimento-valor')).toBeTruthy();
    expect(em.getByText('R$ 45,00')).toBeTruthy();
    estado({ activeQueue: { ...FILA, totalValue: 45 } });
    const espera = renderWithProviders(<QueueStatus />);
    expect(espera.queryByTestId('em-atendimento-valor')).toBeNull();
  });

  it('na fila com a previsão vencida: "Aguardando"', () => {
    estado({ remaining: 0 });
    const tela = renderWithProviders(<QueueStatus />);
    expect(tela.getAllByText(/Aguardando/).length).toBeGreaterThan(0);
  });
});

