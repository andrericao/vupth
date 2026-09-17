import { Alert } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';
import { attendanceService } from '@services/attendanceService';

// D10 (Andre, 17/09): ao tocar em "Sair da fila" com menos de 1h, o aviso
// explica o impacto no próximo cliente e oferece a troca de lugar — sem multa —
// antes de "sair mesmo assim". Aqui se confere a LIGAÇÃO de cada botão.

const mockNavigate = jest.fn();
const mockLeave = jest.fn();
let mockRemaining = 20;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue('1'),
  setItemAsync: jest.fn(),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { professionalId: 'p1', establishmentId: 'e1' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useQueueCountdown', () => ({
  useQueueCountdown: () => ({
    remaining: mockRemaining,
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
      enteredAt: 0,
      estimatedMinutes: mockRemaining,
      status: 'SCHEDULED',
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
  const estado = { leaveQueue: () => mockLeave(), updateQueue: jest.fn() };
  const useQueueStore = (sel: (s: unknown) => unknown) => sel(estado);
  useQueueStore.getState = () => ({ joinQueue: jest.fn() });
  return { useQueueStore };
});
jest.mock('@services/attendanceService', () => ({
  attendanceService: { cancel: jest.fn().mockResolvedValue({}) },
}));
jest.mock('@components/SwapOffersModal', () => {
  const { Text } = jest.requireActual('react-native');
  return { SwapOffersModal: ({ visible }: { visible: boolean }) => (visible ? <Text>ofertas-de-troca</Text> : null) };
});
jest.mock('@components/ChangeTurnModal', () => ({ ChangeTurnModal: () => null }));
jest.mock('@components/RescheduleModal', () => ({ RescheduleModal: () => null }));
jest.mock('@components/RatingModal', () => ({ RatingModal: () => null }));
jest.mock('@components/QueueDisclaimerModal', () => ({ QueueDisclaimerModal: () => null }));

type BotaoDoAlert = { text: string; onPress?: () => unknown };

function tocarEmSair(getAllByText: (t: string) => unknown[]) {
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const [botao] = getAllByText('Sair da fila');
  fireEvent.press(botao as never);
  const [titulo, mensagem, botoes] = alerta.mock.calls[0] as [string, string, BotaoDoAlert[]];
  alerta.mockRestore();
  return { titulo, mensagem, botoes };
}

describe('QueueStatus — o aviso de sair da fila', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemaining = 20;
  });

  it('com menos de 1h: explica o impacto e oferece trocar de lugar antes de sair', () => {
    const { getAllByText } = renderWithProviders(<QueueStatus />);
    const { mensagem, botoes } = tocarEmSair(getAllByText);
    expect(mensagem).toMatch(/próximo cliente é chamado antes do previsto/);
    expect(botoes.map((b) => b.text)).toEqual(['Ficar na fila', 'Trocar de lugar', 'Sair mesmo assim']);
  });

  it('"Trocar de lugar" abre as ofertas de troca e NÃO sai da fila', () => {
    const { getAllByText, getByText } = renderWithProviders(<QueueStatus />);
    const { botoes } = tocarEmSair(getAllByText);
    act(() => {
      botoes.find((b) => b.text === 'Trocar de lugar')!.onPress!();
    });
    expect(getByText('ofertas-de-troca')).toBeTruthy();
    expect(attendanceService.cancel).not.toHaveBeenCalled();
  });

  it('"Sair mesmo assim" cancela, volta ao início e limpa a fila local', async () => {
    const { getAllByText } = renderWithProviders(<QueueStatus />);
    const { botoes } = tocarEmSair(getAllByText);
    await act(async () => {
      await botoes.find((b) => b.text === 'Sair mesmo assim')!.onPress!();
    });
    expect(attendanceService.cancel).toHaveBeenCalledWith('a1', 'tk');
    expect(mockNavigate).toHaveBeenCalledWith('home');
    expect(mockLeave).toHaveBeenCalled();
  });

  it('com 1h ou mais: só confirma, sem falar de multa', () => {
    mockRemaining = 90;
    const { getAllByText } = renderWithProviders(<QueueStatus />);
    const { mensagem, botoes } = tocarEmSair(getAllByText);
    expect(mensagem).toBe('Tem certeza que deseja sair da fila?');
    expect(botoes.map((b) => b.text)).toEqual(['Não', 'Sim, sair']);
  });
});
