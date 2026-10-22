import { Alert } from 'react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';
import { avisoDeFilaExistente } from '@domain/queue/entrarNaFila';

// q246 reprovou em 25/09: "ao tentar entrar na fila que já estou, sou
// encaminhado ao serviço que já existe, mas não aparece aviso". O diálogo de
// 19/09 só disparava na recusa do SERVIDOR — e o servidor só é consultado
// quando o aparelho não sabe da fila.

let mockAtual: Record<string, unknown> | null = null;
const mockParams = { professionalId: 'p1', establishmentId: 'e1', serviceItemIds: ['s1'] as string[] | undefined };

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useMostraPosicao', () => ({ useMostraPosicao: () => true }));
jest.mock('@hooks/useQueueCountdown', () => ({
  useQueueCountdown: () => ({
    remaining: 30, semPrevisao: false, elapsedSeconds: 0, color: '#163300',
    isInQueue: true, isBeingAttended: false, isPaused: false, isFinished: false,
    refresh: jest.fn(), activeQueue: mockAtual,
  }),
}));
jest.mock('@hooks/useSwapOffers', () => ({ useSwapOffers: () => ({ data: [] }) }));
jest.mock('@services/attendanceService', () => ({
  attendanceService: { create: jest.fn(), listClientHistory: jest.fn() },
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk', user: { id: 'u1' } }),
}));
jest.mock('@stores/ratedStore', () => ({ useRatedStore: (sel: (s: unknown) => unknown) => sel({ ids: [] }) }));
jest.mock('@stores/queueStore', () => {
  const estado = { leaveQueue: jest.fn(), updateQueue: jest.fn() };
  const useQueueStore = (sel: (s: unknown) => unknown) => sel(estado);
  useQueueStore.getState = () => ({ ...estado, joinQueue: jest.fn(), activeQueue: mockAtual });
  return { useQueueStore };
});
jest.mock('@components/SwapOffersModal', () => ({ SwapOffersModal: () => null }));
jest.mock('@components/ChangeTurnModal', () => ({ ChangeTurnModal: () => null }));
jest.mock('@components/RescheduleModal', () => ({ RescheduleModal: () => null }));
jest.mock('@components/RatingModal', () => ({ RatingModal: () => null }));
jest.mock('@components/QueueDisclaimerModal', () => ({ QueueDisclaimerModal: () => null }));

const fila = (over: Record<string, unknown> = {}) => ({
  attendanceId: 'a1', professionalId: 'p1', professionalName: 'Carlos',
  establishmentId: 'e1', establishmentName: 'Barbearia', status: 'SCHEDULED',
  enteredAt: Date.now(), estimatedMinutes: 30, ...over,
});

describe('Entrar na fila que o aparelho já tem — o aviso (q246)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.serviceItemIds = ['s1'];
  });

  it('mesmo profissional: avisa, com "Ver minha fila"', () => {
    mockAtual = fila();
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderWithProviders(<QueueStatus />);
    expect(alerta).toHaveBeenCalledWith('Você já está na fila', expect.stringMatching(/fila de Carlos/), [
      { text: 'Ver minha fila' },
    ]);
    alerta.mockRestore();
  });

  it('OUTRO profissional: diz que a fila na tela é outra, e como entrar na nova', () => {
    mockAtual = fila({ professionalId: 'p9', professionalName: 'Ana' });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderWithProviders(<QueueStatus />);
    expect(alerta).toHaveBeenCalledWith('Você já está em outra fila', expect.stringMatching(/saia desta primeiro/), expect.anything());
    alerta.mockRestore();
  });

  it('abrir a própria fila (sem serviços escolhidos) não avisa nada', () => {
    mockAtual = fila();
    mockParams.serviceItemIds = undefined;
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderWithProviders(<QueueStatus />);
    expect(alerta).not.toHaveBeenCalled();
    alerta.mockRestore();
  });

  it('fila guardada já ENCERRADA não conta — pode marcar de novo', () => {
    mockAtual = fila({ status: 'FINISHED' });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderWithProviders(<QueueStatus />);
    expect(alerta).not.toHaveBeenCalledWith('Você já está na fila', expect.anything(), expect.anything());
    alerta.mockRestore();
  });
});

describe('avisoDeFilaExistente', () => {
  it('sem nome do profissional, não inventa', () => {
    expect(avisoDeFilaExistente({ professionalId: 'p1' }, 'p1').mensagem).toMatch(/este profissional/);
  });
});
