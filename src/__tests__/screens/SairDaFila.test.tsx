import { Alert, StyleSheet } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';
import { coresDoTema } from '@domain/tema';
import { attendanceService } from '@services/attendanceService';

// D10 (Andre, 17/09): ao tocar em "Sair da fila" com menos de 1h, o aviso
// explica o impacto no próximo cliente e oferece a troca de lugar — sem multa —
// antes de "sair mesmo assim". Aqui se confere a LIGAÇÃO de cada botão.

const mockNavigate = jest.fn();
const mockLeave = jest.fn();
let mockRemaining = 20;
let mockValor: number | null = null;
let mockIsento = false;

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
      exitPenaltyValue: mockValor,
      penaltyExempt: mockIsento,
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
jest.mock('@components/QueueDisclaimerModal', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    QueueDisclaimerModal: ({ visible, onClose }: { visible: boolean; onClose: (n: boolean) => void }) =>
      visible ? <Text onPress={() => onClose(false)}>Entendi</Text> : null,
  };
});

type BotaoDoAlert = { text: string; onPress?: () => unknown };

// D15 (Andre, 24/09): "Sair da fila" pede DOIS toques seguidos. Desde a fila-aguardando-do-mockup (CLI-32) o
// "Sair da fila" mora no menu Opções: abre o menu e toca na opção (o menu fica aberto até o 2º toque).
function tocar(getByTestId: (id: string) => unknown) {
  fireEvent.press(getByTestId('queue-options') as never);
  fireEvent.press(getByTestId('more-option-leave-queue') as never);
}

describe('QueueStatus — sair da fila (D15)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemaining = 20;
    mockValor = null;
    mockIsento = false;
  });

  it('um toque só não sai e não pergunta nada', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    expect(alerta).not.toHaveBeenCalled();
    expect(attendanceService.cancel).not.toHaveBeenCalled();
    alerta.mockRestore();
  });

  // sair-da-fila-toque-duplo-vermelho (André, 30/10): o pedido mora na descrição da opção, em vermelho, uma vez só;
  // a saída exige dois toques RÁPIDOS (500 ms): um toque, uma pausa e outro toque não sai.
  it('o pedido do duplo toque está só na descrição da opção, em vermelho, e uma vez', () => {
    const { getByTestId, getAllByText } = renderWithProviders(<QueueStatus />);
    fireEvent.press(getByTestId('queue-options'));
    expect(getAllByText('Toque duas vezes seguidas para sair.')).toHaveLength(1);
    const cor = StyleSheet.flatten(getByTestId('more-option-leave-queue-descricao').props.style).color;
    expect(cor).toBe(coresDoTema('claro').danger);
    fireEvent.press(getByTestId('more-option-leave-queue'));
    expect(getAllByText('Toque duas vezes seguidas para sair.')).toHaveLength(1);
  });

  it('um toque, uma pausa de mais de 500 ms e outro toque não saem; dois toques rápidos sim', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const agora = jest.spyOn(Date, 'now');
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    agora.mockReturnValue(1_000_000);
    tocar(getByTestId);
    agora.mockReturnValue(1_000_000 + 700);
    tocar(getByTestId);
    expect(alerta).not.toHaveBeenCalled();
    agora.mockReturnValue(1_000_000 + 700 + 300);
    tocar(getByTestId);
    expect(alerta).toHaveBeenCalled();
    agora.mockRestore();
    alerta.mockRestore();
  });

  // sair-da-fila-so-toque-duplo (André, 28/10): o primeiro toque mostra só o pedido do segundo.
  it('o primeiro toque não mostra faixa de multa nem "Saiba mais"', () => {
    const { getByTestId, queryByText, queryByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    expect(queryByText(/Sair agora gera multa/)).toBeNull();
    expect(queryByTestId('saida-saiba-mais')).toBeNull();
  });

  it('dois toques seguidos com multa abrem "Sair / Cancelar" — e "Permanecer" deixa na fila', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    tocar(getByTestId);
    const [, , botoes] = alerta.mock.calls[0] as [string, string, BotaoDoAlert[]];
    expect(botoes.map((b) => b.text)).toEqual(['Cancelar', 'Sair']);
    expect(attendanceService.cancel).not.toHaveBeenCalled();
    alerta.mockRestore();
  });

  it('"Sair" cancela com a ciência da multa (o valor mostrado), volta ao início e limpa a fila local', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    tocar(getByTestId);
    const [, , botoes] = alerta.mock.calls[0] as [string, string, BotaoDoAlert[]];
    await act(async () => {
      await botoes.find((b) => b.text === 'Sair')!.onPress!();
    });
    // Ciência da multa (Backend 0caf229): o "Sim" leva o valor que o aviso mostrou.
    expect(attendanceService.cancel).toHaveBeenCalledWith('a1', 'tk', 3);
    expect(mockNavigate).toHaveBeenCalledWith('home', undefined, { pop: true });
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
    // Sem multa, não há o que confirmar: nenhum valor vai junto.
    expect(attendanceService.cancel).toHaveBeenCalledWith('a1', 'tk', undefined);
    alerta.mockRestore();
  });

  it('com o valor do servidor (D4), é ele que aparece na confirmação — R$ 5 com 30 min ou menos', () => {
    mockValor = 5;
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    tocar(getByTestId);
    const [, mensagem] = alerta.mock.calls[0] as [string, string];
    expect(mensagem).toMatch(/R\$ 5,00/);
    alerta.mockRestore();
  });

  it('servidor dizendo zero (tolerância) manda sobre a regra local: sai sem confirmação', async () => {
    mockValor = 0;
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    await act(async () => {
      tocar(getByTestId);
    });
    expect(alerta).not.toHaveBeenCalled();
    expect(attendanceService.cancel).toHaveBeenCalled();
    alerta.mockRestore();
  });

  // saida-sem-multa-no-primeiro (DEC-104): isento, a caixa existe mas sem multa.
  it('isento da multa: a faixa e a caixa não falam de multa; "Sair" sai sem ciência', async () => {
    mockIsento = true;
    mockValor = 0;
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, getAllByText, queryByText } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    expect(getAllByText('Toque duas vezes seguidas para sair.')).toHaveLength(1);
    expect(queryByText(/multa/i)).toBeNull();
    tocar(getByTestId);
    const [titulo, mensagem, botoes] = alerta.mock.calls[0] as [string, string, BotaoDoAlert[]];
    expect(titulo).toBe('Sair da fila');
    expect(mensagem).not.toMatch(/multa/i);
    expect(botoes.map((b) => b.text)).toEqual(['Cancelar', 'Sair']);
    await act(async () => {
      await botoes.find((b) => b.text === 'Sair')!.onPress!();
    });
    expect(attendanceService.cancel).toHaveBeenCalledWith('a1', 'tk', undefined);
    alerta.mockRestore();
  });

  it('servidor pedindo a ciência (409): o aviso com o valor DELE, e o "Sim" repete a saída com ele', async () => {
    mockValor = 3;
    (attendanceService.cancel as jest.Mock).mockRejectedValueOnce({
      response: { status: 409, data: { code: 'EXIT_PENALTY_NOT_ACKNOWLEDGED', exitPenaltyValue: 5 } },
    });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    tocar(getByTestId);
    const [, , primeiro] = alerta.mock.calls[0] as [string, string, BotaoDoAlert[]];
    await act(async () => {
      await primeiro.find((b) => b.text === 'Sair')!.onPress!();
    });
    // Recusado: continua na fila, e o segundo aviso traz o valor do servidor.
    expect(mockNavigate).not.toHaveBeenCalled();
    const [, mensagem, segundo] = alerta.mock.calls[1] as [string, string, BotaoDoAlert[]];
    expect(mensagem).toMatch(/R\$ 5,00/);
    await act(async () => {
      await segundo.find((b) => b.text === 'Sair')!.onPress!();
    });
    expect(attendanceService.cancel).toHaveBeenLastCalledWith('a1', 'tk', 5);
    expect(mockNavigate).toHaveBeenCalledWith('home', undefined, { pop: true });
    expect(mockLeave).toHaveBeenCalled();
    alerta.mockRestore();
  });

  it('"Cancelar" no aviso do servidor deixa na fila', async () => {
    (attendanceService.cancel as jest.Mock).mockRejectedValueOnce({
      response: { status: 409, data: { code: 'EXIT_PENALTY_NOT_ACKNOWLEDGED', exitPenaltyValue: 5 } },
    });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<QueueStatus />);
    tocar(getByTestId);
    tocar(getByTestId);
    const [, , primeiro] = alerta.mock.calls[0] as [string, string, BotaoDoAlert[]];
    await act(async () => {
      await primeiro.find((b) => b.text === 'Sair')!.onPress!();
    });
    const [, , segundo] = alerta.mock.calls[1] as [string, string, BotaoDoAlert[]];
    expect(segundo.map((b) => b.text)).toEqual(['Cancelar', 'Sair']);
    expect(attendanceService.cancel).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockLeave).not.toHaveBeenCalled();
    alerta.mockRestore();
  });
});
