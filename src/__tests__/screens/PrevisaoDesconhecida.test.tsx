import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';
import { useQueueCountdown } from '@hooks/useQueueCountdown';

// Andre, 17/09: com o profissional em ALMOÇO, entrou na fila por aceite de
// pedido de corte e a tela disse que o corte era "para AGORA". Parte da causa
// era nossa: sem previsão, o app usava zero — e zero, na tela, é "Agora".

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn().mockResolvedValue('1'), setItemAsync: jest.fn() }));
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
jest.mock('@hooks/useQueueCountdown', () => ({ useQueueCountdown: jest.fn() }));
jest.mock('@hooks/useSwapOffers', () => ({ useSwapOffers: () => ({ data: [] }) }));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk', user: { id: 'u1' } }),
}));
jest.mock('@stores/ratedStore', () => ({ useRatedStore: (sel: (s: unknown) => unknown) => sel({ ids: [] }) }));
jest.mock('@stores/queueStore', () => {
  const estado = { leaveQueue: jest.fn(), updateQueue: jest.fn() };
  const useQueueStore = (sel: (s: unknown) => unknown) => sel(estado);
  useQueueStore.getState = () => ({ joinQueue: jest.fn() });
  return { useQueueStore };
});
jest.mock('@components/SwapOffersModal', () => ({ SwapOffersModal: () => null }));
jest.mock('@components/ChangeTurnModal', () => ({ ChangeTurnModal: () => null }));
jest.mock('@components/RescheduleModal', () => ({ RescheduleModal: () => null }));
jest.mock('@components/RatingModal', () => ({ RatingModal: () => null }));
jest.mock('@components/QueueDisclaimerModal', () => ({ QueueDisclaimerModal: () => null }));

const mockCountdown = useQueueCountdown as jest.Mock;

function fila(over: Record<string, unknown> = {}) {
  return {
    remaining: null,
    semPrevisao: true,
    elapsedSeconds: 0,
    color: '#163300',
    isInQueue: true,
    isBeingAttended: false,
    isPaused: false,
    isFinished: false,
    refresh: jest.fn(),
    activeQueue: {
      attendanceId: 'a1',
      professionalId: 'p1',
      professionalName: 'Carlos',
      establishmentId: 'e1',
      establishmentName: 'Barbearia',
      enteredAt: Date.now(),
      estimatedMinutes: null,
      status: 'SCHEDULED',
    },
    ...over,
  };
}

describe('QueueStatus — enquanto a previsão não chega', () => {
  it('diz "Calculando...", NUNCA "Aguardando" nem um horário inventado', () => {
    mockCountdown.mockReturnValue(fila());
    const { getAllByText, queryByText } = renderWithProviders(<QueueStatus />);
    expect(getAllByText(/Calculando/).length).toBeGreaterThan(0);
    expect(queryByText('Aguardando')).toBeNull();
    expect(queryByText('A qualquer momento')).toBeNull();
  });

  it('com a previsão do servidor, volta a mostrar o tempo', () => {
    mockCountdown.mockReturnValue(
      fila({
        remaining: 40,
        semPrevisao: false,
        activeQueue: { ...fila().activeQueue, estimatedMinutes: 40 },
      }),
    );
    const { queryByText, getAllByText } = renderWithProviders(<QueueStatus />);
    expect(queryByText(/Calculando/)).toBeNull();
    expect(getAllByText(/40/).length).toBeGreaterThan(0);
  });
});
