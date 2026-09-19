import { waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Attendances } from '@screens/Attendances';
import { useClientAttendances } from '@hooks/useAttendances';
import { useQueueCountdown } from '@hooks/useQueueCountdown';

// Andre, 18/09: mudou a vez, saiu do app, entrou de novo e NÃO VIU o
// atendimento que estava esperando. O backend confirmou (19/09) que o
// atendimento continua lá, com status SCHEDULED — ou seja, o servidor sabia e o
// aparelho não. A reconciliação roda uma vez por sessão; se falhar, ninguém
// tenta de novo. Esta tela já busca o histórico a cada 30s: usá-lo fecha o
// buraco seja qual for a causa.

const mockJoin = jest.fn();

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
  useScrollToTop: jest.fn(),
}));
jest.mock('@hooks/useAttendances', () => ({ useClientAttendances: jest.fn() }));
jest.mock('@hooks/useIntentions', () => ({ useClientIntentions: () => ({ data: null, refetch: jest.fn() }) }));
jest.mock('@hooks/useQueueCountdown', () => ({ useQueueCountdown: jest.fn() }));
jest.mock('@hooks/useOutOfQueueSwap', () => ({
  useOutOfQueueSwap: () => ({ pending: [], refetchMyOffers: jest.fn() }),
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk' }),
}));
jest.mock('@stores/ratedStore', () => ({ useRatedStore: (sel: (s: unknown) => unknown) => sel({ ids: [] }) }));
jest.mock('@stores/pendingSwapStore', () => ({
  usePendingSwapStore: (sel: (s: unknown) => unknown) => sel({ removePending: jest.fn() }),
}));
jest.mock('@stores/queueStore', () => {
  const useQueueStore = (sel: (s: unknown) => unknown) => sel({ leaveQueue: jest.fn() });
  useQueueStore.getState = () => ({ joinQueue: mockJoin });
  return { useQueueStore };
});

const mockHistory = useClientAttendances as jest.Mock;
const mockCountdown = useQueueCountdown as jest.Mock;

const aguardando = {
  id: 'a1',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  status: 'SCHEDULED',
  scheduledTime: '2026-09-19T14:00:00Z',
  services: [],
};

function semFilaLocal() {
  mockCountdown.mockReturnValue({
    activeQueue: null, remaining: null, semPrevisao: true,
    isInQueue: false, isBeingAttended: false, isPaused: false,
  });
}

describe('Atendimentos — o servidor manda quando o aparelho esqueceu', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sem fila local e com atendimento ativo no servidor, reconstrói', async () => {
    semFilaLocal();
    mockHistory.mockReturnValue({ data: [aguardando], isLoading: false, refetch: jest.fn(), isRefetching: false });

    renderWithProviders(<Attendances />);
    await waitFor(() =>
      expect(mockJoin).toHaveBeenCalledWith(expect.objectContaining({ attendanceId: 'a1', status: 'SCHEDULED' })),
    );
  });

  it('com fila local, NÃO toca — ela carrega o que o histórico não tem', () => {
    mockCountdown.mockReturnValue({
      activeQueue: { attendanceId: 'a1', status: 'SCHEDULED', initialPosition: 5, estimatedMinutes: 20, enteredAt: Date.now() },
      remaining: 20, semPrevisao: false, isInQueue: true, isBeingAttended: false, isPaused: false,
    });
    mockHistory.mockReturnValue({ data: [aguardando], isLoading: false, refetch: jest.fn(), isRefetching: false });

    renderWithProviders(<Attendances />);
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('atendimento SEM valor não derruba a lista — "—" no lugar do preço', () => {
    semFilaLocal();
    mockHistory.mockReturnValue({
      data: [{ ...aguardando, status: 'FINISHED' }],
      isLoading: false, refetch: jest.fn(), isRefetching: false,
    });
    const { getAllByText, queryByText } = renderWithProviders(<Attendances />);
    // A lista renderiza (sem `toFixed` em undefined, que derrubava a tela) e o
    // preço vira travessão.
    expect(getAllByText('—').length).toBeGreaterThan(0);
    expect(queryByText(/R\$/)).toBeNull();
  });

  it('histórico só com atendimento encerrado não inventa fila', () => {
    semFilaLocal();
    mockHistory.mockReturnValue({
      data: [{ ...aguardando, status: 'FINISHED', totalValue: 30 }],
      isLoading: false, refetch: jest.fn(), isRefetching: false,
    });

    renderWithProviders(<Attendances />);
    expect(mockJoin).not.toHaveBeenCalled();
  });
});
