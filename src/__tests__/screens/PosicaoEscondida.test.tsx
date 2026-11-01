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
    const { getByTestId, getByText } = renderWithProviders(<QueueStatus />);
    expect(getByTestId('queue-position')).toHaveTextContent('3');
    expect(getByText(/Você já passou 2 pessoas/)).toBeTruthy();
    expect(getByTestId('queue-time')).toBeTruthy();
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

  // aguardando-cronometro-e-vez (DEC-149): o cronometro fica numa linha so e encolhe para caber, com ou sem o numero.
  it.each([true, false])('o cronometro fica numa linha so e encolhe para caber (posicao liberada: %s)', (liberada) => {
    mockMostra.mockReturnValue(liberada);
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    const tempo = getByTestId('queue-time');
    expect(tempo.props.numberOfLines).toBe(1);
    expect(tempo.props.adjustsFontSizeToFit).toBe(true);
  });

  it('o cronometro mostra mm:ss com o rotulo "tempo estimado", e as linhas vem na ordem do mockup', () => {
    mockMostra.mockReturnValue(true);
    const base = fila();
    mockCountdown.mockReturnValue({ ...base, activeQueue: { ...base.activeQueue, totalValue: 53.9 } });
    const { getByTestId, getByText } = renderWithProviders(<QueueStatus />);
    expect(getByTestId('queue-time')).toHaveTextContent(/^(39:5\d|40:00)$/);
    expect(getByText('tempo estimado')).toBeTruthy();
    expect(getByText('Pessoas à frente')).toBeTruthy();
    expect(getByText('Início estimado')).toBeTruthy();
    expect(getByText('Valor do serviço')).toBeTruthy();
  });

  it('com a posicao oculta, "Pessoas a frente" some e o cronometro segue', () => {
    mockMostra.mockReturnValue(false);
    const { queryByText, getByText } = renderWithProviders(<QueueStatus />);
    expect(queryByText('Pessoas à frente')).toBeNull();
    expect(getByText('Início estimado')).toBeTruthy();
  });

  it('em 0:00 mostra "Sua vez chegou!" no lugar de "tempo estimado"', () => {
    mockMostra.mockReturnValue(true);
    const base = fila();
    mockCountdown.mockReturnValue({ ...base, remaining: 0, activeQueue: { ...base.activeQueue, enteredAt: Date.now() - 41 * 60000 } });
    const { getByText, queryByText, getByTestId } = renderWithProviders(<QueueStatus />);
    expect(getByTestId('queue-time')).toHaveTextContent('0:00');
    expect(getByText('Sua vez chegou!')).toBeTruthy();
    expect(queryByText('tempo estimado')).toBeNull();
  });

  // aguardando-distribuir-faixas (print do André, 01/11): o espaço livre se divide acima e abaixo do cronômetro e as
  // informações descem (margin-top:auto do mockup). Sem isso a tela inteira ficava colada no topo.
  it.each([true, false])('as faixas ocupam a altura: o cronometro centraliza no espaco livre (posicao liberada: %s)', (liberada) => {
    mockMostra.mockReturnValue(liberada);
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    const estilo = (id: string) => StyleSheet.flatten(getByTestId(id).props.style as never) as Record<string, unknown>;
    expect(estilo('aguardando-faixas').flex).toBe(1);
    expect(estilo('faixa-do-cronometro').flex).toBe(1);
    expect(estilo('faixa-do-cronometro').justifyContent).toBe('center');
  });

  it('as informacoes ficam numa faixa propria, a 44 px do rodape', () => {
    mockMostra.mockReturnValue(true);
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    const info = StyleSheet.flatten(getByTestId('faixa-das-informacoes').props.style as never) as Record<string, unknown>;
    expect(info.marginBottom).toBe(44);
  });
});
