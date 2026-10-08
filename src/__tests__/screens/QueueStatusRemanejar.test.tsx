import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';

// cobertura-98 (08/10): "Mudar minha vez" — reagendar, ir para o fim e a troca
// aberta (Adiantar/Atrasar), com os erros de cada um.

const mockRefresh = jest.fn();
const mockUpdate = jest.fn();
const mockReanchor = jest.fn();
const mockGetQueue = jest.fn();
const mockGetWaitTime = jest.fn();
const mockReschedule = jest.fn();
const mockMoveToEnd = jest.fn();
const mockSwapCreate = jest.fn();
let mockRemaining = 90;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue('1'),
  setItemAsync: jest.fn(),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { professionalId: 'p1', establishmentId: 'e1', abrirMudarVez: true } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/ofertaDePush', () => ({ podeOferecerPush: () => Promise.resolve(false) }));
jest.mock('@hooks/useMostraPosicao', () => ({ useMostraPosicao: () => true }));
jest.mock('@hooks/useQueueCountdown', () => ({
  useQueueCountdown: () => ({
    remaining: mockRemaining,
    elapsedSeconds: 0,
    color: '#163300',
    isInQueue: true,
    isBeingAttended: false,
    isPaused: false,
    isFinished: false,
    refresh: mockRefresh,
    activeQueue: {
      attendanceId: 'a1',
      multaAdvertida: true,
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
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk', user: { id: 'u1' } }),
}));
jest.mock('@stores/ratedStore', () => ({
  useRatedStore: (sel: (s: unknown) => unknown) => sel({ ids: [] }),
}));
jest.mock('@stores/queueStore', () => {
  const estado = { leaveQueue: jest.fn(), updateQueue: (...a: unknown[]) => mockUpdate(...a) };
  const useQueueStore = (sel: (s: unknown) => unknown) => sel(estado);
  useQueueStore.getState = () => ({ joinQueue: jest.fn(), activeQueue: null, reanchorQueue: (...a: unknown[]) => mockReanchor(...a) });
  return { useQueueStore };
});
jest.mock('@services/queueService', () => ({
  queueService: {
    getQueue: (...a: unknown[]) => mockGetQueue(...a),
    getWaitTime: (...a: unknown[]) => mockGetWaitTime(...a),
  },
}));
jest.mock('@services/attendanceService', () => ({
  attendanceService: {
    cancel: jest.fn().mockResolvedValue({}),
    reschedule: (...a: unknown[]) => mockReschedule(...a),
    moveToEnd: (...a: unknown[]) => mockMoveToEnd(...a),
  },
}));
jest.mock('@services/swapOfferService', () => ({
  swapOfferService: { create: (...a: unknown[]) => mockSwapCreate(...a) },
}));
jest.mock('@components/SwapOffersModal', () => ({ SwapOffersModal: () => null }));
jest.mock('@components/RatingModal', () => ({ RatingModal: () => null }));
jest.mock('@components/QueueDisclaimerModal', () => ({ QueueDisclaimerModal: () => null }));
jest.mock('@components/ChangeTurnModal', () => {
  const { Text, View } = jest.requireActual('react-native');
  return {
    ChangeTurnModal: (p: {
      visible: boolean;
      isLast: boolean;
      onMoveToEnd: () => void;
      onReschedule: () => void;
      onCreateSwapOffer: (d: string) => void;
      onClose: () => void;
    }) =>
      p.visible ? (
        <View>
          <Text>{p.isLast ? 'mudar-ultimo' : 'mudar-aberto'}</Text>
          <Text onPress={p.onMoveToEnd}>mudar-fim</Text>
          <Text onPress={p.onReschedule}>mudar-reagendar</Text>
          <Text onPress={() => p.onCreateSwapOffer('EARLIER')}>mudar-adiantar</Text>
          <Text onPress={() => p.onCreateSwapOffer('LATER')}>mudar-atrasar</Text>
          <Text onPress={p.onClose}>mudar-fechar</Text>
        </View>
      ) : null,
  };
});
jest.mock('@components/RescheduleModal', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    RescheduleModal: (p: { visible: boolean; onConfirm: (iso: string) => void }) =>
      p.visible ? <Text onPress={() => p.onConfirm('2026-10-08T18:00:00.000Z')}>reagendar-confirmar</Text> : null,
  };
});

let alertSpy: jest.SpyInstance;

async function tocarNoAlerta(texto: string) {
  const chamadas = alertSpy.mock.calls;
  const botoes = chamadas[chamadas.length - 1][2] as { text: string; onPress?: () => unknown }[];
  const botao = botoes.find((b) => b.text === texto);
  if (!botao) throw new Error(`Alert sem o botão "${texto}"`);
  await act(async () => {
    await botao.onPress?.();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRemaining = 90;
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockGetQueue.mockResolvedValue({
    data: {
      totalRemainingMinutes: 40,
      attendancesInQueue: [
        { id: 'x', status: 'SCHEDULED' },
        { id: 'a1', status: 'SCHEDULED' },
      ],
    },
  });
  mockGetWaitTime.mockResolvedValue({ data: { estimatedWaitingTime: 50 } });
  mockReschedule.mockResolvedValue({ data: { scheduledTime: '2026-10-08T18:00:00.000Z' } });
  mockMoveToEnd.mockResolvedValue({});
  mockSwapCreate.mockResolvedValue({});
});

describe('QueueStatus — Mudar minha vez', () => {
  it('abre pelo pedido do aviso de atraso e sabe que já é o último', async () => {
    const { findByText } = renderWithProviders(<QueueStatus />);
    expect(await findByText('mudar-ultimo')).toBeTruthy();
    expect(mockGetQueue).toHaveBeenCalledWith('p1', 'e1', 'tk');
  });

  it('a fila sem responder ainda abre o menu', async () => {
    mockGetQueue.mockRejectedValue(new Error('rede'));
    const { findByText } = renderWithProviders(<QueueStatus />);
    expect(await findByText('mudar-aberto')).toBeTruthy();
  });

  it('fechar o menu', async () => {
    const { findByText, queryByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-fechar'));
    expect(queryByText('mudar-aberto')).toBeNull();
    expect(queryByText('mudar-ultimo')).toBeNull();
  });
});

describe('QueueStatus — reagendar', () => {
  it('reagenda, re-ancora a espera e avisa', async () => {
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-reagendar'));
    fireEvent.press(await findByText('reagendar-confirmar'));
    await waitFor(() => expect(mockReschedule).toHaveBeenCalledWith('a1', '2026-10-08T18:00:00.000Z', 'tk'));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('sem o horário na resposta, usa o pedido', async () => {
    mockReschedule.mockResolvedValue({ data: {} });
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-reagendar'));
    fireEvent.press(await findByText('reagendar-confirmar'));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });

  it('erro ao reagendar avisa', async () => {
    mockReschedule.mockRejectedValue({ response: { status: 409, data: { code: 'X' } } });
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-reagendar'));
    fireEvent.press(await findByText('reagendar-confirmar'));
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Não foi possível reagendar', expect.any(String)));
  });
});

describe('QueueStatus — ir para o fim', () => {
  it('pergunta, vai para o fim e re-ancora pelo servidor', async () => {
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-fim'));
    expect(alertSpy).toHaveBeenLastCalledWith('Ir para o fim da fila', expect.not.stringContaining('multa'), expect.any(Array));
    await tocarNoAlerta('Ir para o fim');
    expect(mockMoveToEnd).toHaveBeenCalledWith('a1', 'tk');
    expect(mockReanchor).toHaveBeenCalledWith(50);
    expect(alertSpy).toHaveBeenLastCalledWith('Pronto', 'Você foi para o fim da fila.');
  });

  it('com menos de 1h, avisa a multa', async () => {
    mockRemaining = 20;
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-fim'));
    expect(alertSpy).toHaveBeenLastCalledWith('Ir para o fim da fila', expect.stringContaining('multa'), expect.any(Array));
  });

  it('a espera nova sem resposta não impede o "Pronto"', async () => {
    mockGetWaitTime.mockRejectedValue(new Error('x'));
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-fim'));
    await tocarNoAlerta('Ir para o fim');
    expect(alertSpy).toHaveBeenLastCalledWith('Pronto', 'Você foi para o fim da fila.');
  });

  it('erro ao ir para o fim avisa', async () => {
    mockMoveToEnd.mockRejectedValue({ response: { status: 409 } });
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-fim'));
    await tocarNoAlerta('Ir para o fim');
    expect(alertSpy).toHaveBeenLastCalledWith('Não foi possível', expect.any(String));
  });
});

describe('QueueStatus — troca aberta', () => {
  it('Adiantar publica e explica', async () => {
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-adiantar'));
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Pedido publicado', expect.stringContaining('à sua frente')));
    expect(mockSwapCreate).toHaveBeenCalledWith({ attendanceId: 'a1', direction: 'EARLIER' }, 'tk');
  });

  it('Atrasar publica e explica', async () => {
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-atrasar'));
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Pedido publicado', expect.stringContaining('atrás de você')));
  });

  it('fora da espera, o servidor recusa e o app explica', async () => {
    mockSwapCreate.mockRejectedValue({ response: { data: { code: 'QUEUE_SWAP_OFFER_NOT_ALLOWED' } } });
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-adiantar'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenLastCalledWith('Não foi possível publicar', 'A troca só vale enquanto você está aguardando na fila.'),
    );
  });

  it('outro erro mostra a mensagem do servidor, ou a padrão', async () => {
    mockSwapCreate.mockRejectedValueOnce({ response: { data: { message: 'Já há uma oferta' } } });
    const { findByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(await findByText('mudar-adiantar'));
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Não foi possível publicar', 'Já há uma oferta'));

    mockSwapCreate.mockRejectedValueOnce(new Error('x'));
    fireEvent.press(await findByText('mudar-atrasar'));
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Não foi possível publicar', 'Tente novamente em instantes.'));
  });
});
