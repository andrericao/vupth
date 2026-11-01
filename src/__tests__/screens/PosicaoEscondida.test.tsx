import { StyleSheet } from 'react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';
import { useQueueCountdown } from '@hooks/useQueueCountdown';
import { useMostraPosicao } from '@hooks/useMostraPosicao';

// Decisão de 05/09 (Backend 35d57c0): a posição é um interruptor do
// profissional. Escondida, o número grande e as bolinhas somem; o tempo fica.

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
jest.mock('@hooks/useMostraPosicao', () => ({ useMostraPosicao: jest.fn() }));
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
const mockMostra = useMostraPosicao as jest.Mock;

function fila() {
  return {
    remaining: 40,
    semPrevisao: false,
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
      estimatedMinutes: 40,
      status: 'SCHEDULED',
      position: 4,
      initialPosition: 6,
    },
  };
}

describe('QueueStatus — o interruptor da posição', () => {
  beforeEach(() => mockCountdown.mockReturnValue(fila()));

  it('liberada: mostra quantas pessoas na frente e quantas já passaram', () => {
    mockMostra.mockReturnValue(true);
    const { getByTestId, getByText, queryByTestId } = renderWithProviders(<QueueStatus />);
    expect(getByTestId('queue-position')).toHaveTextContent('3');
    expect(getByText(/Você já passou 2 pessoas/)).toBeTruthy();
    expect(queryByTestId('queue-time')).toBeNull();
  });

  it('escondida: nem número, nem bolinhas — o tempo assume o lugar', () => {
    mockMostra.mockReturnValue(false);
    const { queryByTestId, getByTestId, queryByText } = renderWithProviders(<QueueStatus />);
    expect(queryByTestId('queue-position')).toBeNull();
    expect(queryByText(/pessoas na frente|você é o próximo/)).toBeNull();
    expect(queryByText(/já passou/)).toBeNull();
    expect(getByTestId('queue-time')).toBeTruthy();
    expect(mockMostra).toHaveBeenCalledWith('e1', 'p1');
  });

  // aguardando-palavra-quebrada (prints do André, 31/10): sem espera calculada o estado "Aguardando" quebrava no
  // meio da palavra ao lado do contador; agora fica numa linha só e encolhe para caber.
  it('o estado ao lado do contador fica numa linha so e encolhe para caber (nao quebra "Aguardando" no meio)', () => {
    mockMostra.mockReturnValue(true);
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    const coluna = getByTestId('queue-time-coluna');
    expect(coluna.props.numberOfLines).toBe(1);
    expect(coluna.props.adjustsFontSizeToFit).toBe(true);
  });

  it('sem o contador, o estado tambem fica numa linha so e encolhe para caber', () => {
    mockMostra.mockReturnValue(false);
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    const sozinho = getByTestId('queue-time');
    expect(sozinho.props.numberOfLines).toBe(1);
    expect(sozinho.props.adjustsFontSizeToFit).toBe(true);
  });

  it('a palavra "Aguardando" (espera zerada) usa fonte menor que a de um tempo, para caber na coluna (e na web)', () => {
    mockMostra.mockReturnValue(true);
    const tamanho = (no: { props: { style?: unknown } }) => (StyleSheet.flatten(no.props.style as never) as { fontSize: number }).fontSize;
    mockCountdown.mockReturnValue({ ...fila(), remaining: 0 });
    const palavra = renderWithProviders(<QueueStatus />);
    const daPalavra = tamanho(palavra.getByTestId('queue-time-coluna'));
    palavra.unmount();
    mockCountdown.mockReturnValue(fila());
    const tempo = renderWithProviders(<QueueStatus />);
    expect(daPalavra).toBeLessThan(tamanho(tempo.getByTestId('queue-time-coluna')));
  });
});
