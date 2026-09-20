import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';

// A faixa da janela sem multa (Andre, 20/09). Ela aparece ASSIM QUE O CLIENTE
// ENTRA na fila, como o "cancelamento gratuito até HH:MM" do Uber — e é faixa,
// não popup: interromper quem acabou de entrar é cobrar pedágio pela regra.

let mockRemaining: number | null = 90;
let mockEstimated: number | null = 90;
let mockEmAtendimento = false;

// Entrou às 12:00 (relógio local do teste).
const ENTROU = new Date(2026, 8, 20, 12, 0, 0).getTime();

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
      enteredAt: ENTROU,
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

describe('QueueStatus — a faixa da janela sem multa', () => {
  beforeEach(() => {
    mockRemaining = 90;
    mockEstimated = 90;
    mockEmAtendimento = false;
  });

  it('na entrada, diz até que horas dá para sair de graça', () => {
    const { getByTestId, getByText } = renderWithProviders(<QueueStatus />);

    expect(getByTestId('faixa-sem-multa')).toBeTruthy();
    expect(getByText(/sem multa até 12:30/)).toBeTruthy();
  });

  it('quando a janela acaba, a faixa muda de texto em vez de sumir', () => {
    mockRemaining = 30;
    const { getByTestId, getByText } = renderWithProviders(<QueueStatus />);

    expect(getByTestId('faixa-sem-multa')).toBeTruthy();
    expect(getByText(/sair agora custa R\$ 3,00/)).toBeTruthy();
  });

  it('sem previsão, não há faixa — não se afirma o que não se sabe', () => {
    mockRemaining = null;
    mockEstimated = null;
    const { queryByTestId } = renderWithProviders(<QueueStatus />);

    expect(queryByTestId('faixa-sem-multa')).toBeNull();
  });

  it('em atendimento a faixa some — não há mais fila de onde sair', () => {
    mockEmAtendimento = true;
    const { queryByTestId } = renderWithProviders(<QueueStatus />);

    expect(queryByTestId('faixa-sem-multa')).toBeNull();
  });
});
