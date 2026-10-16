import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Attendances } from '@screens/Attendances';
import { useClientAttendances } from '@hooks/useAttendances';
import { useQueueCountdown } from '@hooks/useQueueCountdown';

// cobertura-98 (08/10): Atendimentos — o card da fila viva em cada estado, os
// pedidos de troca e os agendamentos com o cancelar, o detalhe e o avaliar.

const mockParentNavigate = jest.fn();
const mockNavigate = jest.fn();
const mockRefetch = jest.fn();
const mockRefetchIntentions = jest.fn();
const mockRefetchOffers = jest.fn();
const mockRemovePending = jest.fn();
const mockCancelIntention = jest.fn();
const mockCancelSwap = jest.fn();
const mockJoin = jest.fn();
let mockIntentions: unknown[] | undefined = [];
let mockPending: unknown[] = [];

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, getParent: () => ({ navigate: mockParentNavigate }) }),
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react');
    useEffect(() => {
      cb();
    }, [cb]);
  },
  useScrollToTop: jest.fn(),
}));
jest.mock('@hooks/useAttendances', () => ({ useClientAttendances: jest.fn() }));
jest.mock('@hooks/useIntentions', () => ({
  useClientIntentions: () => ({ data: { intentions: mockIntentions }, refetch: mockRefetchIntentions }),
}));
jest.mock('@hooks/useMostraPosicao', () => ({ useMostraPosicao: () => true }));
jest.mock('@hooks/useQueueCountdown', () => ({ useQueueCountdown: jest.fn() }));
jest.mock('@hooks/useOutOfQueueSwap', () => ({
  useOutOfQueueSwap: () => ({ pending: mockPending, refetchMyOffers: mockRefetchOffers }),
}));
jest.mock('@hooks/usePilulaDeTopo', () => ({
  usePilulaDeTopo: () => ({ visivel: true, onScroll: jest.fn(), onLayout: jest.fn() }),
}));
jest.mock('@components/PilulaVoltarAoTopo', () => {
  const { Text } = jest.requireActual('react-native');
  return { PilulaVoltarAoTopo: ({ onPress }: { onPress: () => void }) => <Text onPress={onPress}>pilula</Text> };
});
jest.mock('@services/intentionsService', () => ({
  intentionsService: { cancel: (...a: unknown[]) => mockCancelIntention(...a) },
}));
jest.mock('@services/swapOfferService', () => ({
  swapOfferService: { cancel: (...a: unknown[]) => mockCancelSwap(...a) },
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk' }),
}));
jest.mock('@stores/ratedStore', () => ({ useRatedStore: (sel: (s: unknown) => unknown) => sel({ ids: [] }) }));
jest.mock('@stores/pendingSwapStore', () => ({
  usePendingSwapStore: (sel: (s: unknown) => unknown) => sel({ removePending: (...a: unknown[]) => mockRemovePending(...a) }),
}));
jest.mock('@stores/queueStore', () => {
  const useQueueStore = (sel: (s: unknown) => unknown) => sel({ leaveQueue: jest.fn() });
  useQueueStore.getState = () => ({ joinQueue: mockJoin });
  return { useQueueStore };
});
jest.mock('@components/AttendanceDetailModal', () => {
  const { Text, View } = jest.requireActual('react-native');
  return {
    AttendanceDetailModal: (p: { attendance: unknown; onClose: () => void; onVerProfissional: () => void; onRate: () => void }) =>
      p.attendance ? (
        <View>
          <Text onPress={p.onVerProfissional}>detalhe-ver-profissional</Text>
          <Text onPress={p.onRate}>detalhe-avaliar</Text>
          <Text onPress={p.onClose}>detalhe-fechar</Text>
        </View>
      ) : null,
  };
});
jest.mock('@components/RatingModal', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    RatingModal: (p: { visible: boolean; professionalName?: string; onClose: () => void }) =>
      p.visible ? <Text onPress={p.onClose}>{`avaliar-${p.professionalName}`}</Text> : null,
  };
});

const mockHistory = useClientAttendances as jest.Mock;
const mockCountdown = useQueueCountdown as jest.Mock;

const FILA = {
  attendanceId: 'a1',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  estimatedMinutes: 15,
};
const REALIZADO = {
  id: 'r1',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  status: 'FINISHED',
  scheduledTime: '2026-09-19T14:00:00Z',
  services: [],
  totalValue: 30,
};

function contagem(over: Record<string, unknown> = {}) {
  mockCountdown.mockReturnValue({
    activeQueue: FILA,
    remaining: 15,
    isInQueue: true,
    isBeingAttended: false,
    isPaused: false,
    isLate: false,
    ...over,
  });
}

function historico(data: unknown[] = [], isLoading = false) {
  mockHistory.mockReturnValue({ data, isLoading, refetch: mockRefetch, isRefetching: false });
}

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
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockIntentions = [];
  mockPending = [];
  mockCancelIntention.mockResolvedValue({});
  mockCancelSwap.mockResolvedValue({});
  mockRemovePending.mockResolvedValue(undefined);
  contagem();
  historico();
});

describe('Atendimentos — a fila viva', () => {
  it('ao focar, atualiza o histórico e os agendamentos', () => {
    renderWithProviders(<Attendances />);
    expect(mockRefetch).toHaveBeenCalled();
    expect(mockRefetchIntentions).toHaveBeenCalled();
  });

  it('mostra a espera e o toque abre a fila', () => {
    const { getByText } = renderWithProviders(<Attendances />);
    fireEvent.press(getByText('Barbearia'));
    expect(mockParentNavigate).toHaveBeenCalledWith('homeTab', expect.objectContaining({ screen: 'queueStatus', pop: true }));
  });

  it('em atendimento', () => {
    contagem({ isBeingAttended: true, isInQueue: false });
    expect(renderWithProviders(<Attendances />).getByText('Em atendimento')).toBeTruthy();
  });

  it('pausado', () => {
    contagem({ isPaused: true });
    expect(renderWithProviders(<Attendances />).getByText('Pausado')).toBeTruthy();
  });

  it('atrasado: "Você foi chamado"', () => {
    contagem({ isLate: true, isInQueue: false });
    expect(renderWithProviders(<Attendances />).getByText('Você foi chamado')).toBeTruthy();
  });

  it('sem previsão: "Calculando..."', () => {
    contagem({ remaining: null });
    expect(renderWithProviders(<Attendances />).getByText('Calculando...')).toBeTruthy();
  });

  it('carregando o histórico mostra o esqueleto', () => {
    historico([], true);
    const { queryByText } = renderWithProviders(<Attendances />);
    expect(queryByText('Carlos')).toBeTruthy();
  });

  it('a pílula volta ao topo', () => {
    const { getByText } = renderWithProviders(<Attendances />);
    expect(() => fireEvent.press(getByText('pilula'))).not.toThrow();
  });
});

describe('Atendimentos — pedido de troca de fora da fila', () => {
  beforeEach(() => {
    mockPending = [{ offerId: 'o1', professionalName: 'Ana', establishmentName: 'Studio' }];
  });

  it('cancelar pergunta e cancela', async () => {
    const { getByText } = renderWithProviders(<Attendances />);
    expect(getByText('Aguardando alguém da fila ceder o lugar')).toBeTruthy();
    fireEvent.press(getByText('Cancelar'));
    await tocarNoAlerta('Cancelar pedido');
    expect(mockCancelSwap).toHaveBeenCalledWith('o1', 'tk');
    expect(mockRemovePending).toHaveBeenCalledWith('o1');
    expect(mockRefetchOffers).toHaveBeenCalled();
  });

  it('já fechado (422/404) some da lista do mesmo jeito', async () => {
    mockCancelSwap.mockRejectedValue({ response: { status: 422 } });
    const { getByText } = renderWithProviders(<Attendances />);
    fireEvent.press(getByText('Cancelar'));
    await tocarNoAlerta('Cancelar pedido');
    expect(mockRemovePending).toHaveBeenCalledWith('o1');
  });

  it('outro erro avisa', async () => {
    mockCancelSwap.mockRejectedValue({ response: { status: 500 } });
    const { getByText } = renderWithProviders(<Attendances />);
    fireEvent.press(getByText('Cancelar'));
    await tocarNoAlerta('Cancelar pedido');
    expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'Não foi possível cancelar o pedido. Tente de novo.');
  });
});

describe('Atendimentos — meus agendamentos', () => {
  beforeEach(() => {
    mockIntentions = [
      {
        id: 'i1',
        desiredTime: '2030-01-10T15:00:00Z',
        professionalName: 'Bia',
        establishmentName: 'Salão',
        status: 'INTENTION',
        services: [{ customName: 'Corte' }],
        estimatedStartTime: '2030-01-10T15:20:00Z',
      },
      {
        id: 'i2',
        desiredTime: '2030-01-10T17:00:00Z',
        professionalName: 'Bia',
        establishmentName: 'Salão',
        status: 'INTENTION',
        services: [],
      },
    ];
  });

  it('cancelar pergunta, cancela e recarrega', async () => {
    const { getAllByText, getByText } = renderWithProviders(<Attendances />);
    expect(getByText('Corte')).toBeTruthy();
    expect(getByText('Salão')).toBeTruthy();
    fireEvent.press(getAllByText('Cancelar')[0]);
    await tocarNoAlerta('Cancelar agendamento');
    expect(mockCancelIntention).toHaveBeenCalledWith('i1', 'tk');
    expect(mockRefetchIntentions).toHaveBeenCalled();
  });

  it('400: já virou fila', async () => {
    mockCancelIntention.mockRejectedValue({ response: { status: 400 } });
    const { getAllByText } = renderWithProviders(<Attendances />);
    fireEvent.press(getAllByText('Cancelar')[0]);
    await tocarNoAlerta('Cancelar agendamento');
    expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'Este agendamento já virou fila (ou já foi cancelado).');
  });

  it('outro erro: a mensagem do servidor, ou a padrão', async () => {
    mockCancelIntention.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Falhou' } } });
    const { getAllByText } = renderWithProviders(<Attendances />);
    fireEvent.press(getAllByText('Cancelar')[0]);
    await tocarNoAlerta('Cancelar agendamento');
    expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'Falhou');

    mockCancelIntention.mockRejectedValueOnce(new Error('x'));
    fireEvent.press(getAllByText('Cancelar')[0]);
    await tocarNoAlerta('Cancelar agendamento');
    expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'Erro ao cancelar o agendamento');
  });
});

describe('Atendimentos — realizados', () => {
  beforeEach(() => {
    contagem({ activeQueue: null, isInQueue: false });
    historico([REALIZADO]);
  });

  it('o toque abre o detalhe, e dali o profissional', () => {
    const { getAllByText, getByText, queryByText } = renderWithProviders(<Attendances />);
    fireEvent.press(getAllByText('Carlos')[getAllByText('Carlos').length - 1]);
    fireEvent.press(getByText('detalhe-ver-profissional'));
    expect(mockNavigate).toHaveBeenCalledWith('professionalInfo', expect.objectContaining({ professionalId: 'p1' }));
    expect(queryByText('detalhe-ver-profissional')).toBeNull();
  });

  it('do detalhe, avaliar abre a avaliação; fechar fecha', async () => {
    const { getAllByText, getByText, queryByText } = renderWithProviders(<Attendances />);
    fireEvent.press(getAllByText('Carlos')[getAllByText('Carlos').length - 1]);
    fireEvent.press(getByText('detalhe-avaliar'));
    expect(getByText('avaliar-Carlos')).toBeTruthy();
    fireEvent.press(getByText('avaliar-Carlos'));
    await waitFor(() => expect(queryByText('avaliar-Carlos')).toBeNull());
  });

  it('o convite "Avaliar agora" abre a avaliação direto', () => {
    const { getByTestId, getByText } = renderWithProviders(<Attendances />);
    fireEvent.press(getByTestId('avaliar-agora'));
    expect(getByText('avaliar-Carlos')).toBeTruthy();
  });

  it('fechar o detalhe', () => {
    const { getByTestId, getByText, queryByText } = renderWithProviders(<Attendances />);
    fireEvent.press(getByTestId('convite-avaliar'));
    fireEvent.press(getByText('detalhe-fechar'));
    expect(queryByText('detalhe-fechar')).toBeNull();
  });
});

describe('Atendimentos — o que sobra (cobertura-98)', () => {
  it('sem histórico nem agenda carregados, a tela abre vazia', () => {
    contagem({ activeQueue: null, isInQueue: false });
    mockHistory.mockReturnValue({ data: undefined, isLoading: false, refetch: mockRefetch, isRefetching: false });
    mockIntentions = undefined;
    expect(() => renderWithProviders(<Attendances />)).not.toThrow();
  });

  it('atendimento ativo no histórico sem fila no aparelho: a fila volta', () => {
    contagem({ activeQueue: null, isInQueue: false });
    historico([{ ...REALIZADO, id: 'v1', status: 'SCHEDULED', scheduledTime: new Date().toISOString() }]);
    renderWithProviders(<Attendances />);
    expect(mockJoin).toHaveBeenCalledWith(expect.objectContaining({ attendanceId: 'v1' }));
  });

  it('o convite sem o nome do profissional abre a avaliação mesmo assim', () => {
    contagem({ activeQueue: null, isInQueue: false });
    historico([{ ...REALIZADO, professionalName: undefined }]);
    const { getByTestId, getByText } = renderWithProviders(<Attendances />);
    fireEvent.press(getByTestId('avaliar-agora'));
    expect(getByText('avaliar-')).toBeTruthy();
  });

  it('cancelado, sem loja e sem valor: "—" e só "ver detalhes"', () => {
    contagem({ activeQueue: null, isInQueue: false });
    historico([
      { ...REALIZADO, id: 'c1', status: 'CANCELLED', establishmentName: undefined, totalValue: null, services: [{ customName: 'Barba' }] },
    ]);
    const { getByText, queryByTestId } = renderWithProviders(<Attendances />);
    expect(getByText('Barba')).toBeTruthy();
    expect(getByText('—')).toBeTruthy();
    expect(getByText('Toque para ver detalhes')).toBeTruthy();
    expect(queryByTestId('historico-loja-c1')).toBeNull();
  });

  it('"Cancelando..." enquanto o pedido de troca e o agendamento cancelam', async () => {
    mockPending = [{ offerId: 'o1', professionalName: 'Ana', establishmentName: 'Studio' }];
    mockIntentions = [
      { id: 'i1', desiredTime: '2030-01-10T15:00:00Z', professionalName: 'Bia', establishmentName: 'Salão', status: 'INTENTION', services: [] },
    ];
    mockCancelSwap.mockReturnValue(new Promise(() => {}));
    mockCancelIntention.mockReturnValue(new Promise(() => {}));
    const { getAllByText } = renderWithProviders(<Attendances />);
    fireEvent.press(getAllByText('Cancelar')[0]);
    act(() => {
      void tocarNoAlerta('Cancelar pedido');
    });
    fireEvent.press(getAllByText('Cancelar')[0]);
    act(() => {
      void tocarNoAlerta('Cancelar agendamento');
    });
    await waitFor(() => expect(getAllByText('Cancelando...')).toHaveLength(2));
  });
});

