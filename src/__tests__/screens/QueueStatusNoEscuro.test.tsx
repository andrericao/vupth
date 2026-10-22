import { ScrollView } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { QueueStatus } from '@screens/QueueStatus';
import { coresDoTema } from '@domain/tema';
import {
  TEMAS,
  type No,
  bordaSobre,
  corDe,
  estilo,
  fundoSobre,
  razao,
  renderNoTema,
  voltarAoClaro,
} from '../utils/nosDoisTemas';

// DEC-75: a tela da fila lida nos DOIS temas. O erro que isto evita: o numero da
// fila e os cartoes escritos em forest/hex, que no escuro e a cor do fundo (o
// numero some, o cartao de "marcar de novo" vira um bloco claro berrante).

let mockEstado: Record<string, unknown> = {};

jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue('1'),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));
// O icone entra como um no com a cor que recebeu: e assim que se le a cor dele.
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return new Proxy(
    {},
    { get: (_t, nome) => (props: { color?: string }) => createElement(View, { testID: `icone-${String(nome)}`, cor: props.color }) },
  );
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
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
jest.mock('@services/paymentService', () => ({
  paymentService: { get: jest.fn().mockResolvedValue({ data: { status: 'PAID', amount: 30 } }) },
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk', user: { id: 'u1' } }),
}));
jest.mock('@stores/ratedStore', () => ({ useRatedStore: (sel: (s: unknown) => unknown) => sel({ ids: [] }) }));
jest.mock('@stores/queueStore', () => {
  const estado = { leaveQueue: jest.fn(), updateQueue: jest.fn() };
  const useQueueStore = (sel: (s: unknown) => unknown) => sel(estado);
  useQueueStore.getState = () => ({ ...estado, joinQueue: jest.fn(), activeQueue: null });
  return { useQueueStore };
});
jest.mock('@components/SwapOffersModal', () => ({ SwapOffersModal: () => null }));
jest.mock('@components/ChangeTurnModal', () => ({ ChangeTurnModal: () => null }));
jest.mock('@components/RescheduleModal', () => ({ RescheduleModal: () => null }));
jest.mock('@components/RatingModal', () => ({ RatingModal: () => null }));
jest.mock('@components/QueueDisclaimerModal', () => ({ QueueDisclaimerModal: () => null }));

jest.setTimeout(90000);

const FILA = {
  attendanceId: 'a1',
  multaAdvertida: true,
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  enteredAt: 0,
  estimatedMinutes: 90,
  status: 'SCHEDULED',
  position: 4,
  initialPosition: 6,
  serviceMinutes: 30,
};

function estado(over: Record<string, unknown>, fila: Record<string, unknown> = {}) {
  mockEstado = {
    remaining: 90,
    semPrevisao: false,
    elapsedSeconds: 125,
    color: '#F59E0B',
    isInQueue: false,
    isBeingAttended: false,
    isPaused: false,
    isFinished: false,
    refresh: jest.fn(),
    activeQueue: { ...FILA, ...fila },
    ...over,
  };
}

const cor = (tema: 'claro' | 'escuro') => coresDoTema(tema);

describe('QueueStatus: esperando (o hero verde)', () => {
  beforeEach(() => estado({ isInQueue: true }));

  it.each(TEMAS)('%s: o numero, o apoio e o link ficam em onGreen sobre o verde, que e o mesmo nos dois temas', (tema) => {
    const { getByTestId, getByText, getAllByTestId } = renderNoTema(tema, <QueueStatus />);
    const numero = getByTestId('queue-position');
    // onGreen e forest, o mesmo hex nos dois temas: o numero NAO muda de cor.
    expect(corDe(numero)).toBe('#163300');
    expect(fundoSobre(numero)).toBe('#9FE870');
    expect(razao(corDe(numero)!, fundoSobre(numero)!)).toBeGreaterThanOrEqual(4.5);
    expect(corDe(getByText('PARA A SUA VEZ'))).toBe('#163300');
    expect(corDe(getByText('pessoas na frente'))).toBe('#163300');
    expect(corDe(getByText('Pedidos de troca'))).toBe('#163300');
    // o apoio translucido segue o onGreen, e e o alpha de antes
    expect(corDe(getByText('~1h 30min de espera'))).toBe('#163300BF');
    expect(corDe(getByText('Sair da fila'))).toBe('#163300CC');
    // os icones do hero: o "i" do topo em onGreen; o de repetir em green sobre a pilula forest
    expect(getAllByTestId('icone-Info')[0].props.cor).toBe('#163300');
    expect(getByTestId('icone-Repeat2').props.cor).toBe('#9FE870');
  });

  it.each(TEMAS)('%s: a pilula "Mudar minha vez" e forest com texto green nos dois temas', (tema) => {
    const { getByText } = renderNoTema(tema, <QueueStatus />);
    const texto = getByText('Mudar minha vez');
    expect(corDe(texto)).toBe('#9FE870');
    expect(fundoSobre(texto)).toBe('#163300');
  });
});

describe('QueueStatus: a faixa da saida troca o texto junto com o fundo', () => {
  function abrirFaixa(tema: 'claro' | 'escuro') {
    const tela = renderNoTema(tema, <QueueStatus />);
    fireEvent.press(tela.getByTestId('leave-queue'));
    return tela;
  }

  it('com multa: onAccentPeach sobre o ambar. No escuro o ambar vira marrom e forest sumiria', () => {
    estado({ isInQueue: true }, { exitPenaltyValue: 3 });
    for (const tema of TEMAS) {
      const { getByText, getByTestId, unmount } = abrirFaixa(tema);
      const frase = getByText('Sair agora gera multa de R$ 3,00.');
      expect(corDe(frase)).toBe(cor(tema).onAccentPeach);
      expect(estilo(getByTestId('faixa-de-saida')).backgroundColor).toBe(cor(tema).warning);
      expect(razao(corDe(frase)!, cor(tema).warning)).toBeGreaterThanOrEqual(4.5);
      expect(corDe(getByText('Saiba mais'))).toBe(cor(tema).onAccentPeach);
      unmount();
    }
  });

  it('sem multa: textPrimary sobre o fundo da tela (forest sobre o escuro daria 1:1)', () => {
    estado({ isInQueue: true }, { exitPenaltyValue: 0 });
    for (const tema of TEMAS) {
      const { getByText, getByTestId, unmount } = abrirFaixa(tema);
      const faixa = getByTestId('faixa-de-saida');
      const frase = faixa.findAll((n: No) => typeof n.props.children === 'string' && n.props.children !== 'Saiba mais' && n.type === 'Text')[0];
      expect(estilo(faixa).backgroundColor).toBe(cor(tema).background);
      expect(corDe(frase)).toBe(cor(tema).textPrimary);
      expect(corDe(getByText('Saiba mais'))).toBe(cor(tema).textPrimary);
      expect(razao(corDe(frase)!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);
      unmount();
    }
  });
});

describe('QueueStatus: concluido', () => {
  beforeEach(() => estado({ isFinished: true }));

  it.each(TEMAS)('%s: o titulo e textPrimary, o fundo e o da tela e o cartao de marcar de novo usa o par do greenTint', (tema) => {
    const { getByText, getByTestId, UNSAFE_getAllByType } = renderNoTema(tema, <QueueStatus />);
    const titulo = getByText('PRONTO!');
    expect(corDe(titulo)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(titulo)).toBe(cor(tema).background);
    expect(estilo(UNSAFE_getAllByType(ScrollView)[0]).backgroundColor).toBe(cor(tema).background);
    expect(razao(corDe(titulo)!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);

    // o check dentro do circulo verde: onGreen nos dois temas
    expect(getByTestId('icone-Check').props.cor).toBe('#163300');

    const marcar = getByText('Marcar de novo com Carlos');
    expect(corDe(marcar)).toBe(cor(tema).onGreenTint);
    expect(fundoSobre(marcar)).toBe(cor(tema).greenTint);
    expect(razao(corDe(marcar)!, fundoSobre(marcar)!)).toBeGreaterThanOrEqual(4.5);
    expect(getByTestId('icone-ChevronRight').props.cor).toBe(cor(tema).onGreenTint);
  });

  it('no claro e o que era: forest em tudo', () => {
    const { getByText, getByTestId } = renderNoTema('claro', <QueueStatus />);
    expect(corDe(getByText('PRONTO!'))).toBe('#163300');
    expect(corDe(getByText('Marcar de novo com Carlos'))).toBe('#163300');
    expect(getByTestId('icone-ChevronRight').props.cor).toBe('#163300');
  });

  it('as iniciais sobre o circulo verde sao onGreen (onGreenTint seria verde sobre verde no escuro)', () => {
    const { getByText } = renderNoTema('escuro', <QueueStatus />);
    const iniciais = getByText('C');
    expect(fundoSobre(iniciais)).toBe('#9FE870');
    expect(razao(corDe(iniciais)!, '#9FE870')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('QueueStatus: em atendimento (a tela de cartao)', () => {
  beforeEach(() => estado({ isBeingAttended: true, activeQueue: { ...FILA, status: 'IN_PROGRESS' } }));

  it.each(TEMAS)('%s: o tempo e a borda do cartao seguem o tema; os apoios sao textSecondary', (tema) => {
    const { getByTestId, getByText } = renderNoTema(tema, <QueueStatus />);
    const tempo = getByTestId('queue-time');
    expect(corDe(tempo)).toBe(cor(tema).textPrimary);
    expect(bordaSobre(tempo)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(tempo)).toBe(cor(tema).surface);
    expect(razao(corDe(tempo)!, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);
    expect(corDe(getByText('Tempo de atendimento'))).toBe(cor(tema).textSecondary);
  });

  it('na fila, o tempo e a borda sao a cor da urgencia que o hook devolve', () => {
    estado({ isInQueue: true, isPaused: true, color: '#EF4444', activeQueue: { ...FILA, status: 'SCHEDULED' } });
    const { getByTestId } = renderNoTema('escuro', <QueueStatus />);
    const tempo = getByTestId('queue-time');
    expect(corDe(tempo)).toBe('#EF4444');
    expect(bordaSobre(tempo)).toBe('#EF4444');
  });

  it.each(TEMAS)('%s: o "i" ao lado de "Duracao estimada" e textSecondary', (tema) => {
    estado({ isInQueue: true, isPaused: true, activeQueue: { ...FILA, status: 'SCHEDULED' } });
    const { getByTestId } = renderNoTema(tema, <QueueStatus />);
    expect(getByTestId('icone-Info').props.cor).toBe(cor(tema).textSecondary);
  });
});

afterAll(voltarAoClaro);
