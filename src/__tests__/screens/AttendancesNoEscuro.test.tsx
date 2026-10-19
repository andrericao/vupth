import { RefreshControl } from 'react-native';

import { Attendances } from '@screens/Attendances';
import { coresDoTema } from '@domain/tema';
import { TEMAS, type No, corDe, fundoSobre, razao, renderNoTema, voltarAoClaro } from '../utils/nosDoisTemas';

// DEC-75: Atendimentos nos dois temas. O erro que isto evita: o selo de cada
// status era um PAR DE HEX do claro (#E2F6D5 + #163300 etc.), entao no escuro o
// "Concluido" seria um bloco claro berrante no meio do cartao escuro, e os
// icones eram forest sobre a surface.

let mockFila: Record<string, unknown> = {};
let mockHistorico: unknown[] = [];
let mockPendentes: unknown[] = [];

jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return new Proxy(
    {},
    { get: (_t, nome) => (props: { color?: string }) => createElement(View, { testID: `icone-${String(nome)}`, cor: props.color }) },
  );
});
jest.mock('@components/LiveDot', () => {
  const { View } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return { LiveDot: (props: { color?: string }) => createElement(View, { testID: 'live-dot', cor: props.color }) };
});
jest.mock('@components/AttendanceDetailModal', () => ({ AttendanceDetailModal: () => null }));
jest.mock('@components/RatingModal', () => ({ RatingModal: () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), setParams: jest.fn(), getParent: () => ({ navigate: jest.fn() }) }),
  useRoute: () => ({ params: undefined }),
  useFocusEffect: jest.fn(),
  useScrollToTop: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useAttendances', () => ({
  useClientAttendances: () => ({ data: mockHistorico, isLoading: false, refetch: jest.fn(), isRefetching: false }),
}));
jest.mock('@hooks/useIntentions', () => ({ useClientIntentions: () => ({ data: null, refetch: jest.fn() }) }));
jest.mock('@hooks/usePagamentosPendentes', () => ({
  usePagamentosPendentes: () => ({ data: mockPendentes, refetch: jest.fn() }),
}));
jest.mock('@hooks/useQueueCountdown', () => ({ useQueueCountdown: () => mockFila }));
jest.mock('@hooks/useOutOfQueueSwap', () => ({
  useOutOfQueueSwap: () => ({
    pending: [{ offerId: 'o1', professionalName: 'Marina', establishmentName: 'Salao' }],
    refetchMyOffers: jest.fn(),
  }),
}));
jest.mock('@stores/authStore', () => ({ useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk' }) }));
jest.mock('@stores/ratedStore', () => ({ useRatedStore: (sel: (s: unknown) => unknown) => sel({ ids: [] }) }));
jest.mock('@stores/pendingSwapStore', () => ({
  usePendingSwapStore: (sel: (s: unknown) => unknown) => sel({ removePending: jest.fn() }),
}));
jest.mock('@stores/queueStore', () => {
  const useQueueStore = (sel: (s: unknown) => unknown) => sel({ leaveQueue: jest.fn() });
  useQueueStore.getState = () => ({ joinQueue: jest.fn() });
  return { useQueueStore };
});

jest.setTimeout(90000);

const cor = (tema: 'claro' | 'escuro') => coresDoTema(tema);

const atendimento = (id: string, status: string, over: Record<string, unknown> = {}) => ({
  id,
  professionalId: 'p1',
  professionalName: `Profissional ${id}`,
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  status,
  scheduledTime: '2026-10-10T14:00:00Z',
  services: [{ customName: 'Corte' }],
  totalValue: 30,
  rated: true,
  ...over,
});

beforeEach(() => {
  mockFila = { activeQueue: null, remaining: null, isInQueue: false, isBeingAttended: false, isPaused: false, isLate: false };
  mockHistorico = [];
  mockPendentes = [];
});

describe('Atendimentos: os selos de status trocam de tema', () => {
  beforeEach(() => {
    mockHistorico = [atendimento('a1', 'FINISHED'), atendimento('a2', 'CANCELLED'), atendimento('a3', 'REMOVED')];
  });

  it.each(TEMAS)('%s: Concluido usa o par do greenTint', (tema) => {
    const { getByText } = renderNoTema(tema, <Attendances />);
    const selo = getByText('Concluído');
    expect(corDe(selo)).toBe(cor(tema).onGreenTint);
    expect(fundoSobre(selo)).toBe(cor(tema).greenTint);
    expect(razao(corDe(selo)!, cor(tema).greenTint)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEMAS)('%s: Cancelado e Retirado usam danger sobre um bloco que aparece dentro do cartao', (tema) => {
    const { getByText } = renderNoTema(tema, <Attendances />);
    for (const texto of ['Cancelado', 'Retirado pela loja']) {
      const selo = getByText(texto);
      expect(corDe(selo)).toBe(cor(tema).danger);
      // sobrePainel: a surface no claro (como era) e o segundo nivel no escuro, para nao sumir no cartao surface
      expect(fundoSobre(selo)).toBe(cor(tema).sobrePainel);
      expect(razao(corDe(selo)!, cor(tema).sobrePainel)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('no claro os pares sao os hex de antes', () => {
    const { getByText } = renderNoTema('claro', <Attendances />);
    expect([corDe(getByText('Concluído')), fundoSobre(getByText('Concluído'))]).toEqual(['#163300', '#E2F6D5']);
    expect([corDe(getByText('Cancelado')), fundoSobre(getByText('Cancelado'))]).toEqual(['#B3261E', '#F3F5F1']);
  });

  it('no escuro o selo nao e um bloco claro berrante', () => {
    const { getByText } = renderNoTema('escuro', <Attendances />);
    expect(fundoSobre(getByText('Concluído'))).not.toBe('#E2F6D5');
    expect(fundoSobre(getByText('Cancelado'))).not.toBe('#F3F5F1');
  });
});

describe('Atendimentos: os icones e as listas', () => {
  it.each(TEMAS)('%s: sem nada, o vazio e o icone neutro (le nos dois fundos) e o aviso e textSecondary', (tema) => {
    const { getByText, getByTestId } = renderNoTema(tema, <Attendances />);
    expect(getByTestId('icone-Clock').props.cor).toBe('#9CA3AF');
    expect(razao('#9CA3AF', cor(tema).background)).toBeGreaterThanOrEqual(tema === 'escuro' ? 4.5 : 2.5);
    expect(corDe(getByText('Nenhum atendimento realizado ainda'))).toBe(cor(tema).textSecondary);
  });

  it.each(TEMAS)('%s: a seta do atendimento por avaliar e textPrimary, e a das avaliadas textSecondary', (tema) => {
    mockHistorico = [atendimento('a1', 'FINISHED', { rated: false }), atendimento('a2', 'CANCELLED')];
    const { getAllByTestId } = renderNoTema(tema, <Attendances />);
    const setas = getAllByTestId('icone-ChevronRight').map((s) => s.props.cor);
    expect(setas).toContain(cor(tema).textPrimary);
    expect(setas).toContain(cor(tema).textSecondary);
  });

  it.each(TEMAS)('%s: pedidos de troca e agendamentos: o icone e textPrimary sobre a surface', (tema) => {
    const { getByTestId } = renderNoTema(tema, <Attendances />);
    expect(getByTestId('icone-Repeat2').props.cor).toBe(cor(tema).textPrimary);
    expect(fundoSobre(getByTestId('icone-Repeat2'))).toBe(cor(tema).surface);
  });

  it.each(TEMAS)('%s: puxar para atualizar usa a cor do texto', (tema) => {
    const { UNSAFE_getByType } = renderNoTema(tema, <Attendances />);
    const puxar = UNSAFE_getByType(RefreshControl);
    expect(puxar.props.tintColor).toBe(cor(tema).textPrimary);
    expect(puxar.props.colors).toEqual([cor(tema).textPrimary]);
  });

  it.each(TEMAS)('%s: o pagamento pendente: seta textPrimary na surface', (tema) => {
    mockPendentes = [
      { attendance_id: 'p9', status: 'PENDING', amount: 30, professional_name: 'Carlos', establishment_name: 'Barbearia' },
    ];
    const { getByTestId } = renderNoTema(tema, <Attendances />);
    const seta = getByTestId('pagar-p9').findAll((n: No) => n.props.testID === 'icone-ChevronRight')[0];
    expect(seta.props.cor).toBe(cor(tema).textPrimary);
  });
});

describe('Atendimentos: o convite para avaliar (greenTint) e o cartao em andamento', () => {
  it.each(TEMAS)('%s: o convite usa o par do greenTint e o botao Avaliar o onGreen sobre o green', (tema) => {
    mockHistorico = [atendimento('a1', 'FINISHED', { rated: false, professionalName: 'Carlos' })];
    const { getByText, getByTestId } = renderNoTema(tema, <Attendances />);
    const titulo = getByText('Como foi com Carlos?');
    expect(corDe(titulo)).toBe(cor(tema).onGreenTint);
    expect(fundoSobre(titulo)).toBe(cor(tema).greenTint);
    expect(razao(corDe(titulo)!, cor(tema).greenTint)).toBeGreaterThanOrEqual(4.5);
    expect(getByTestId('icone-Star').props.cor).toBe(cor(tema).onGreenTint);

    const avaliar = getByText('Avaliar');
    expect(corDe(avaliar)).toBe('#163300');
    expect(fundoSobre(avaliar)).toBe('#9FE870');
  });

  it.each(TEMAS)('%s: na fila, o nome e textPrimary e a pilula de tempo e onGreen sobre o green', (tema) => {
    mockFila = {
      activeQueue: { establishmentName: 'Barbearia Alfa', professionalName: 'Carlos', professionalId: 'p1', establishmentId: 'e1' },
      remaining: 25,
      isInQueue: true,
      isBeingAttended: false,
      isPaused: false,
      isLate: false,
    };
    const { getByText, getByTestId, getAllByTestId } = renderNoTema(tema, <Attendances />);
    const nome = getByText('Barbearia Alfa');
    expect(corDe(nome)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(nome)).toBe(cor(tema).background);
    expect(razao(corDe(nome)!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);
    expect(getByTestId('icone-Users').props.cor).toBe(cor(tema).textPrimary);

    const tempo = getByText('25 min');
    expect(corDe(tempo)).toBe('#163300');
    expect(fundoSobre(tempo)).toBe('#9FE870');
    expect(getAllByTestId('live-dot')[0].props.cor).toBe('#163300');
  });
});

afterAll(voltarAoClaro);
