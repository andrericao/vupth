import { fireEvent } from '@testing-library/react-native';

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
jest.mock('@hooks/ofertaDePush', () => ({ podeOferecerPush: () => Promise.resolve(false) }));
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

beforeEach(() => jest.clearAllMocks());

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

  it('as trocas abrem pelo botão', () => {
    const { getByTestId, getByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(getByTestId('ver-trocas'));
    expect(getByText('trocas-abertas')).toBeTruthy();
  });
});
