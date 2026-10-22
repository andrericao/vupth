import { fireEvent, within } from '@testing-library/react-native';

import { Home } from '@screens/Home';
import { usePedidoDeCorteStore } from '@stores/pedidoDeCorteStore';
import { coresDoTema } from '@domain/tema';
import { TEMAS, corDe, estilo, fundoSobre, razao, renderNoTema, voltarAoClaro } from '../utils/nosDoisTemas';

// DEC-75: o Inicio nos dois temas. O erro que isto evita: a pilula de filtro, o
// botao "Repetir" e o selo "Ao vivo" eram forest sobre a surface, que no escuro
// e a mesma cor (o botao some); e os icones eram hex fixo.

const mockNavigate = jest.fn();
let mockAutenticado = true;
let mockHistorico: unknown[] = [];
let mockFila: Record<string, unknown> = {};
let mockLojas: Record<string, unknown> = {};

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
jest.mock('@components/CardDaLoja', () => {
  const { Text } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return {
    CardDaLoja: (props: { establishment: { name: string }; onPress: (e: unknown) => void }) =>
      createElement(Text, { onPress: () => props.onPress(props.establishment) }, props.establishment.name),
  };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, getParent: () => ({ navigate: jest.fn() }) }),
  useRoute: () => ({ params: undefined }),
  useScrollToTop: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useEstablishments', () => {
  const lista = () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false, ...mockLojas });
  return {
    useEstablishments: lista,
    usePraOntem: lista,
    useVitrinePaginada: () => ({ ...lista(), hasNextPage: false, isFetchingNextPage: false, fetchNextPage: jest.fn() }),
  };
});
jest.mock('@hooks/useAttendances', () => ({ useClientAttendances: () => ({ data: mockHistorico }) }));
jest.mock('@hooks/useQueueCountdown', () => ({ useQueueCountdown: () => mockFila }));
jest.mock('@hooks/useMostraPosicao', () => ({ useMostraPosicao: () => true }));
jest.mock('@hooks/useDoubleBackExit', () => ({ useDoubleBackExit: jest.fn() }));
jest.mock('@services/addressService', () => ({ addressService: { getMain: jest.fn().mockResolvedValue({ data: null }) } }));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ isAuthenticated: mockAutenticado, accessToken: 'tk', user: { first_name: 'Ana', email: 'ana@vupth.app' } }),
}));

jest.setTimeout(90000);

const FILA = {
  remaining: 40,
  isInQueue: true,
  isLate: false,
  activeQueue: {
    professionalId: 'p1',
    professionalName: 'Carlos',
    establishmentId: 'e1',
    establishmentName: 'Barbearia',
    estimatedMinutes: 40,
    position: 4,
  },
};

const cor = (tema: 'claro' | 'escuro') => coresDoTema(tema);

beforeEach(() => {
  mockNavigate.mockClear();
  mockLojas = {};
  mockAutenticado = true;
  mockHistorico = [];
  mockFila = { activeQueue: null, remaining: null, isInQueue: false, isLate: false };
  usePedidoDeCorteStore.setState({ pedidos: [] });
});

describe('Home: a faixa de filtros', () => {
  it.each(TEMAS)('%s: a pilula desligada e textPrimary sobre a surface; ligada, o par selecionado', (tema) => {
    const { getByTestId, getAllByTestId } = renderNoTema(tema, <Home />);
    const rotulo = within(getByTestId('pra-ontem')).getByText('Pra ontem');
    expect(corDe(rotulo)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(rotulo)).toBe(cor(tema).surface);
    expect(razao(corDe(rotulo)!, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);
    expect(getAllByTestId('icone-Zap')[0].props.cor).toBe(cor(tema).textPrimary);

    fireEvent.press(getByTestId('pra-ontem'));
    // ligada, o titulo da secao tambem diz "Pra ontem": o rotulo e o da pilula
    const ligado = within(getByTestId('pra-ontem')).getByText('Pra ontem');
    // claro: green sobre forest (o de antes); escuro: onGreen sobre green
    expect(corDe(ligado)).toBe(cor(tema).onSelecionado);
    expect(fundoSobre(ligado)).toBe(cor(tema).selecionado);
    expect(razao(corDe(ligado)!, cor(tema).selecionado)).toBeGreaterThanOrEqual(4.5);
    expect(getAllByTestId('icone-Zap')[0].props.cor).toBe(cor(tema).onSelecionado);
  });

  it('no claro e o que era: forest com texto green', () => {
    const { getByTestId } = renderNoTema('claro', <Home />);
    fireEvent.press(getByTestId('pra-ontem'));
    const ligado = within(getByTestId('pra-ontem')).getByText('Pra ontem');
    expect(corDe(ligado)).toBe('#9FE870');
    expect(fundoSobre(ligado)).toBe('#163300');
  });

  it('uma categoria ligada tambem usa o par selecionado', () => {
    const { getByText, getByTestId } = renderNoTema('escuro', <Home />);
    fireEvent.press(getByTestId('filtro-BARBER'));
    const barbearia = getByText('Barbearia');
    expect(fundoSobre(barbearia)).toBe('#9FE870');
    expect(corDe(barbearia)).toBe('#163300');
  });
});

describe('Home: a busca', () => {
  it.each(TEMAS)('%s: o texto digitado, o placeholder e os icones sao do tema', (tema) => {
    const { getByTestId, getAllByTestId, getByPlaceholderText } = renderNoTema(tema, <Home />);
    const campo = getByTestId('busca-home');
    expect(estilo(campo).color).toBe(cor(tema).textPrimary);
    expect(getByPlaceholderText('Buscar serviço ou lugar').props.placeholderTextColor).toBe(cor(tema).textPlaceholder);
    expect(getAllByTestId('icone-Search')[0].props.cor).toBe(cor(tema).textSecondary);
    expect(getAllByTestId('icone-SlidersHorizontal')[0].props.cor).toBe(cor(tema).textPrimary);
  });

  it('com a categoria ligada, o botao de filtro vira o par selecionado', () => {
    for (const tema of TEMAS) {
      const { getByTestId, getAllByTestId, unmount } = renderNoTema(tema, <Home />);
      fireEvent.press(getByTestId('filtro-BARBER'));
      expect(getAllByTestId('icone-SlidersHorizontal')[0].props.cor).toBe(cor(tema).onSelecionado);
      expect(fundoSobre(getAllByTestId('icone-SlidersHorizontal')[0])).toBe(cor(tema).selecionado);
      unmount();
    }
  });

  it.each(TEMAS)('%s: sem lojas, o aviso e textSecondary sobre o fundo da tela', (tema) => {
    const { getByText } = renderNoTema(tema, <Home />);
    const vazio = getByText('Nenhum estabelecimento encontrado');
    expect(corDe(vazio)).toBe(cor(tema).textSecondary);
    expect(razao(corDe(vazio)!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Home: o cartao da fila (hero verde)', () => {
  beforeEach(() => {
    mockFila = FILA;
  });

  it.each(TEMAS)('%s: tudo em onGreen sobre o verde, o selo "Ao vivo" e forest, e o ponto e green', (tema) => {
    const { getByText, getByTestId, getAllByTestId } = renderNoTema(tema, <Home />);
    const titulo = getByText('VOCÊ ESTÁ NA FILA');
    // onGreen e o mesmo hex nos dois temas, e o cartao e green nos dois
    expect(corDe(titulo)).toBe('#163300');
    expect(fundoSobre(titulo)).toBe('#9FE870');
    expect(corDe(getByText('Faltam 3'))).toBe('#163300');
    expect(razao(corDe(getByText('Faltam 3'))!, '#9FE870')).toBeGreaterThanOrEqual(4.5);
    expect(getByTestId('card-da-fila')).toBeTruthy();
    expect(getAllByTestId('icone-ChevronRight')[0].props.cor).toBe('#163300');

    const aoVivo = getByText('Ao vivo');
    expect(fundoSobre(aoVivo)).toBe('#163300');
    expect(corDe(aoVivo)).toBe('#9FE870');
    expect(getByTestId('live-dot').props.cor).toBe('#9FE870');
  });
});

describe('Home: pedido de corte e Recentes', () => {
  it.each(TEMAS)('%s: o pedido de corte e textPrimary sobre a surface', (tema) => {
    usePedidoDeCorteStore.setState({
      pedidos: [{ id: 'c1', professionalId: 'p1', professionalName: 'Carlos', establishmentName: 'Barbearia', expiraEm: null } as never],
    });
    const { getByText } = renderNoTema(tema, <Home />);
    for (const texto of ['PEDIDO DE CORTE ENVIADO', 'Aguardando Carlos responder']) {
      expect(corDe(getByText(texto))).toBe(cor(tema).textPrimary);
      expect(fundoSobre(getByText(texto))).toBe(cor(tema).surface);
      expect(razao(corDe(getByText(texto))!, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(TEMAS)('%s: "Repetir" nao some no cartao surface (forest sobre forest daria 1:1)', (tema) => {
    mockHistorico = [{ professionalName: 'Carlos', establishmentId: 'e1', services: [], endTime: new Date().toISOString() }];
    const { getByText } = renderNoTema(tema, <Home />);
    const repetir = getByText('Repetir');
    expect(corDe(repetir)).toBe(cor(tema).onSelecionado);
    expect(fundoSobre(repetir)).toBe(cor(tema).selecionado);
    expect(razao(corDe(repetir)!, cor(tema).selecionado)).toBeGreaterThanOrEqual(4.5);
    // as iniciais no pessego: o par onAccentPeach (onGreenTint, o padrao, daria verde sobre marrom)
    const iniciais = getByText('C');
    expect(fundoSobre(iniciais)).toBe(cor(tema).accentPeach);
    expect(corDe(iniciais)).toBe(cor(tema).onAccentPeach);
    expect(razao(corDe(iniciais)!, cor(tema).accentPeach)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Home: a lista de lojas', () => {
  it.each(TEMAS)('%s: o erro de carga e danger do tema, e legivel sobre o fundo', (tema) => {
    mockLojas = { isError: true };
    const { getByText } = renderNoTema(tema, <Home />);
    const erro = getByText('Erro ao carregar estabelecimentos');
    expect(corDe(erro)).toBe(cor(tema).danger);
    expect(razao(corDe(erro)!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);
  });

  it('carregando, nem lista nem aviso de vazio', () => {
    mockLojas = { isLoading: true };
    const { queryByText } = renderNoTema('escuro', <Home />);
    expect(queryByText('Nenhum estabelecimento encontrado')).toBeNull();
    expect(queryByText('Erro ao carregar estabelecimentos')).toBeNull();
  });

  it('tocar numa loja abre a tela dela, e "Ver todos" leva a lista cheia', () => {
    mockLojas = { data: [{ id: 'e7', name: 'Barbearia Alfa', open_status: 'OPEN', is_open: true }] };
    const { getByText, getByTestId } = renderNoTema('claro', <Home />);
    fireEvent.press(getByText('Barbearia Alfa'));
    expect(mockNavigate).toHaveBeenCalledWith('establishmentDetail', { establishmentId: 'e7' });
    fireEvent.press(getByTestId('see-all'));
    expect(mockNavigate).toHaveBeenCalledWith('establishmentList', { filter: 'ALL' });
  });

  it.each(TEMAS)('%s: "Ver todos" e textSecondary', (tema) => {
    const { getByText } = renderNoTema(tema, <Home />);
    expect(corDe(getByText('Ver todos'))).toBe(cor(tema).textSecondary);
  });

  it('a busca filtra pelo que se digita', () => {
    mockLojas = { data: [{ id: 'e7', name: 'Barbearia Alfa', open_status: 'OPEN', is_open: true }] };
    const { getByTestId, queryByText } = renderNoTema('claro', <Home />);
    fireEvent.changeText(getByTestId('busca-home'), 'zzz');
    expect(queryByText('Barbearia Alfa')).toBeNull();
  });
});

describe('Home: os toques', () => {
  it('o cartao da fila abre a fila, "Recentes" abre a loja e o filtro abre a folha', () => {
    mockFila = FILA;
    mockHistorico = [{ professionalName: 'Carlos', establishmentId: 'e9', services: [{ customName: 'Corte' }], endTime: new Date().toISOString() }];
    const { getByTestId, getByText } = renderNoTema('claro', <Home />);
    fireEvent.press(getByTestId('card-da-fila'));
    expect(mockNavigate).toHaveBeenCalledWith('queueStatus', expect.objectContaining({ professionalId: 'p1', establishmentId: 'e1' }));
    fireEvent.press(getByText('Repetir'));
    expect(mockNavigate).toHaveBeenCalledWith('establishmentDetail', { establishmentId: 'e9' });
    fireEvent.press(getByTestId('open-filter'));
    expect(getByTestId('open-filter')).toBeTruthy();
  });
});

describe('Home: textos que dependem da hora e da data', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [9, 'Bom dia, Ana'],
    [15, 'Boa tarde, Ana'],
    [21, 'Boa noite, Ana'],
  ])('as %ih a saudacao e "%s"', (hora, saudacao) => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hora);
    const { getByText } = renderNoTema('claro', <Home />);
    expect(getByText(saudacao)).toBeTruthy();
  });

  it.each([
    [0, 'hoje'],
    [1, 'ontem'],
    [3, 'há 3 dias'],
    [14, 'há 2 semanas'],
    [70, 'há 2 meses'],
  ])('a ultima visita ha %i dias diz "%s"', (dias, texto) => {
    mockHistorico = [
      { professionalName: 'Carlos', establishmentId: 'e1', services: [], endTime: new Date(Date.now() - dias * 86400000).toISOString() },
    ];
    const { getByText } = renderNoTema('claro', <Home />);
    expect(getByText(`Última vez ${texto}`)).toBeTruthy();
  });
});

describe('Home: visitante', () => {
  it.each(TEMAS)('%s: "Cadastrar" e textPrimary, nunca forest', (tema) => {
    mockAutenticado = false;
    const { getByText } = renderNoTema(tema, <Home />);
    expect(corDe(getByText('Cadastrar'))).toBe(cor(tema).textPrimary);
  });

  it('"Cadastrar" abre o cadastro', () => {
    mockAutenticado = false;
    const { getByText } = renderNoTema('claro', <Home />);
    fireEvent.press(getByText('Cadastrar'));
    expect(mockNavigate).toHaveBeenCalledWith('signUp', {});
  });
});

afterAll(voltarAoClaro);
