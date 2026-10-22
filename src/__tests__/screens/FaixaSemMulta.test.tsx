import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';

// A faixa da janela sem multa (Andre, 20/09). Ela aparece ASSIM QUE O CLIENTE
// ENTRA na fila, como o "cancelamento gratuito até HH:MM" do Uber — e é faixa,
// não popup: interromper quem acabou de entrar é cobrar pedágio pela regra.

let mockRemaining: number | null = 90;
let mockEstimated: number | null = 90;
let mockEmAtendimento = false;

// Entrou às 12:00 (relógio local do teste). O prefixo `mock` NÃO é estilo: a
// fábrica do `jest.mock` é içada para antes dos imports, e o babel só deixa
// ela citar identificadores que começam assim.
const mockEntrou = new Date(2026, 8, 20, 12, 0, 0).getTime();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue('1'),
  setItemAsync: jest.fn(),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { professionalId: 'p1', establishmentId: 'e1' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useMostraPosicao', () => ({ useMostraPosicao: () => true }));
jest.mock('@hooks/useQueueCountdown', () => ({
  useQueueCountdown: () => ({
    remaining: mockRemaining,
    semPrevisao: mockRemaining == null,
    elapsedSeconds: 0,
    color: '#163300',
    isInQueue: !mockEmAtendimento,
    isBeingAttended: mockEmAtendimento,
    isPaused: false,
    isFinished: false,
    refresh: jest.fn(),
    activeQueue: {
      attendanceId: 'a1',
      professionalId: 'p1',
      professionalName: 'Carlos',
      establishmentId: 'e1',
      establishmentName: 'Barbearia',
      enteredAt: mockEntrou,
      estimatedMinutes: mockEstimated,
      status: mockEmAtendimento ? 'IN_PROGRESS' : 'SCHEDULED',
    },
  }),
}));
jest.mock('@hooks/useSwapOffers', () => ({ useSwapOffers: () => ({ data: [] }) }));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk', user: null }),
}));
jest.mock('@stores/ratedStore', () => ({
  useRatedStore: (sel: (s: unknown) => unknown) => sel({ ids: [] }),
}));
jest.mock('@stores/queueStore', () => {
  const estado = { leaveQueue: jest.fn(), updateQueue: jest.fn() };
  const useQueueStore = (sel: (s: unknown) => unknown) => sel(estado);
  useQueueStore.getState = () => ({ joinQueue: jest.fn() });
  return { useQueueStore };
});
jest.mock('@services/attendanceService', () => ({
  attendanceService: { cancel: jest.fn().mockResolvedValue({}) },
}));
jest.mock('@components/SwapOffersModal', () => ({ SwapOffersModal: () => null }));
jest.mock('@components/ChangeTurnModal', () => ({ ChangeTurnModal: () => null }));
jest.mock('@components/RescheduleModal', () => ({ RescheduleModal: () => null }));
jest.mock('@components/RatingModal', () => ({ RatingModal: () => null }));
jest.mock('@components/QueueDisclaimerModal', () => ({ QueueDisclaimerModal: () => null }));

describe('QueueStatus — nenhuma faixa enquanto a pessoa só espera (D15)', () => {
  // A faixa fixa de 20/09 saiu no teste de 25/09: ela empurrava "Sair da fila"
  // para fora da tela e mostrava o VALOR da multa na entrada. Pela D15, a faixa
  // só aparece quando a pessoa tenta sair.
  beforeEach(() => {
    mockRemaining = 90;
    mockEstimated = 90;
    mockEmAtendimento = false;
  });

  it('com espera longa, não há faixa nem valor na tela', () => {
    const { queryByTestId, queryByText } = renderWithProviders(<QueueStatus />);
    expect(queryByTestId('faixa-de-saida')).toBeNull();
    expect(queryByText(/R\$/)).toBeNull();
  });

  it('com menos de 1h, também não — o valor só aparece ao tentar sair', () => {
    mockRemaining = 30;
    const { queryByTestId, queryByText } = renderWithProviders(<QueueStatus />);
    expect(queryByTestId('faixa-de-saida')).toBeNull();
    expect(queryByText(/R\$/)).toBeNull();
  });

  it('"Sair da fila" continua na tela', () => {
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    expect(getByTestId('leave-queue')).toBeTruthy();
  });
});
