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

// D15 (Andre, 24/09): "Sair da fila" pede DOIS toques seguidos. O teste usa o
// testID do link — o texto "Sair da fila" também aparece dentro da faixa.
function tocar(getByTestId: (id: string) => unknown) {
  fireEvent.press(getByTestId('leave-queue') as never);
}

describe('QueueStatus — sair da fila (D15)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemaining = 20;
  });

  it('um toque só mostra a faixa — não sai, não pergunta nada', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    expect(getByTestId('faixa-de-saida')).toBeTruthy();
    expect(alerta).not.toHaveBeenCalled();
    expect(attendanceService.cancel).not.toHaveBeenCalled();
    alerta.mockRestore();
  });

  it('com menos de 1h, a faixa diz o valor e o porquê — e só a multa, sem convite de troca', () => {
    const { getByTestId, getByText, queryByText } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    expect(getByText(/sair agora gera multa de R\$ 3,00/)).toBeTruthy();
    expect(getByText(/quem está atrás é chamado antes do previsto/)).toBeTruthy();
    expect(queryByText(/Trocar de lugar/)).toBeNull();
  });

  it('dois toques seguidos com multa abrem "Sim / Não" — e "Não" deixa na fila', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    tocar(getByTestId);
    const [, , botoes] = alerta.mock.calls[0] as [string, string, BotaoDoAlert[]];
    expect(botoes.map((b) => b.text)).toEqual(['Não', 'Sim, sair']);
    expect(attendanceService.cancel).not.toHaveBeenCalled();
    alerta.mockRestore();
  });

  it('"Sim, sair" cancela, volta ao início e limpa a fila local', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    tocar(getByTestId);
    const [, , botoes] = alerta.mock.calls[0] as [string, string, BotaoDoAlert[]];
    await act(async () => {
      await botoes.find((b) => b.text === 'Sim, sair')!.onPress!();
    });
    expect(attendanceService.cancel).toHaveBeenCalledWith('a1', 'tk');
    expect(mockNavigate).toHaveBeenCalledWith('home');
    expect(mockLeave).toHaveBeenCalled();
    alerta.mockRestore();
  });

  it('sem multa (1h ou mais), os dois toques tiram direto — sem confirmação', async () => {
    mockRemaining = 90;
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    await act(async () => {
      tocar(getByTestId);
    });
    expect(alerta).not.toHaveBeenCalled();
    expect(attendanceService.cancel).toHaveBeenCalledWith('a1', 'tk');
    alerta.mockRestore();
  });
});
