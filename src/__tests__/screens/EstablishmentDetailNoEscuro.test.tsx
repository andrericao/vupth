import { coresDoTema } from '@domain/tema';
import { TEMAS, type No, corDe, estilo, fundoSobre, razao, renderNoTema, voltarAoClaro } from '../utils/nosDoisTemas';
import { EstablishmentDetail } from '@screens/EstablishmentDetail';

// DEC-75: a tela da loja nos dois temas. O erro que isto evita: o nome do
// profissional e o titulo em forest, o selo "Ao vivo" e o aviso de loja fechada
// em hex, e o ponto de "Fechada agora" no warning, que no escuro e um marrom que
// some no fundo.

let mockAberta = true;
let mockFoto: string | null = null;

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
    {
      get: (_t, nome) => (props: { color?: string; fill?: string }) =>
        createElement(View, { testID: `icone-${String(nome)}`, cor: props.color, preenchimento: props.fill }),
    },
  );
});
jest.mock('@components/LiveDot', () => {
  const { View } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return { LiveDot: (props: { color?: string }) => createElement(View, { testID: 'live-dot', cor: props.color }) };
});
jest.mock('@components/BadgeAgendar', () => ({ BadgeAgendar: () => null }));
jest.mock('@components/FotoAmpliada', () => ({ FotoAmpliada: () => null }));
jest.mock('@components/NotaDaLoja', () => ({ NotaDaLoja: () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { establishmentId: 'e1' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useQueueSocket', () => ({ useQueueSocket: jest.fn() }));
jest.mock('@stores/favoritesStore', () => ({
  useFavoritesStore: (sel: (s: unknown) => unknown) => sel({ ids: ['e1'], toggleFavorite: jest.fn() }),
}));
jest.mock('@hooks/useEstablishments', () => ({
  useEstablishment: () => ({
    data: {
      id: 'e1',
      name: 'Barbearia',
      open_status: 'OPEN',
      is_open: mockAberta,
      services: [],
      ownerId: 'o1',
      urlImage: mockFoto,
      status: 'ACTIVE',
      address: { street: 'Rua Um', number: '10', neighborhood: 'Centro', city: 'Recife' },
    },
    isLoading: false,
    isError: false,
  }),
  useProfessionalsWithQueue: () => ({
    data: [
      { id: 'p1', name: 'Carlos', work_status: 'WORKING', queue_count: 2, estimated_wait_minutes: 30, specialty: 'Barbeiro' },
      { id: 'p2', name: 'Marina', work_status: 'OFF', queue_count: 0, estimated_wait_minutes: 0, specialty: 'Barbeira' },
    ],
  }),
  useEstablishmentHours: () => ({
    data: {
      configured: true,
      weekly: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((day) => ({
        day,
        closed: false,
        opens: '08:00',
        closes: '18:00',
      })),
      exceptions: [],
      upcoming: [],
    },
  }),
}));

jest.setTimeout(90000);

const cor = (tema: 'claro' | 'escuro') => coresDoTema(tema);

beforeEach(() => {
  mockAberta = true;
  mockFoto = null;
});

describe('EstablishmentDetail: a linha do profissional', () => {
  it.each(TEMAS)('%s: o nome e textPrimary sobre a surface; os icones sao do tema', (tema) => {
    const { getByText, getAllByTestId } = renderNoTema(tema, <EstablishmentDetail />);
    const nome = getByText('Carlos');
    expect(corDe(nome)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(nome)).toBe(cor(tema).surface);
    expect(razao(corDe(nome)!, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);
    // o "i" do profissional e a seta
    expect(getAllByTestId('icone-Info')[0].props.cor).toBe(cor(tema).textPrimary);
    expect(getAllByTestId('icone-ChevronRight')[0].props.cor).toBe(cor(tema).textSecondary);
  });

  it('no claro e o que era: forest e o cinza da marca', () => {
    const { getByText, getAllByTestId } = renderNoTema('claro', <EstablishmentDetail />);
    expect(corDe(getByText('Carlos'))).toBe('#163300');
    expect(getAllByTestId('icone-Info')[0].props.cor).toBe('#163300');
    expect(getAllByTestId('icone-ChevronRight')[0].props.cor).toBe('#454745');
  });
});

describe('EstablishmentDetail: o corpo', () => {
  it.each(TEMAS)('%s: titulo da secao, selo "Ao vivo" e icones de apoio seguem o tema', (tema) => {
    const { getByText, getByTestId, getAllByTestId } = renderNoTema(tema, <EstablishmentDetail />);
    const secao = getByText('Quem está atendendo');
    expect(corDe(secao)).toBe(cor(tema).textPrimary);
    expect(razao(corDe(secao)!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);

    const aoVivo = getByText('Ao vivo');
    expect(corDe(aoVivo)).toBe(cor(tema).onGreenTint);
    expect(fundoSobre(aoVivo)).toBe(cor(tema).greenTint);
    expect(razao(corDe(aoVivo)!, cor(tema).greenTint)).toBeGreaterThanOrEqual(4.5);
    expect(getAllByTestId('live-dot')[0].props.cor).toBe(cor(tema).onGreenTint);

    expect(getByTestId('icone-Clock').props.cor).toBe(cor(tema).textSecondary);
    expect(getByTestId('icone-MapPin').props.cor).toBe(cor(tema).textSecondary);
  });

  it.each(TEMAS)('%s: "Como chegar" e textPrimary', (tema) => {
    const { getByText } = renderNoTema(tema, <EstablishmentDetail />);
    expect(corDe(getByText(/Como chegar/))).toBe(cor(tema).textPrimary);
  });

  it.each(TEMAS)('%s: o ponto de loja fechada e o pessego (o warning do escuro e um marrom que some)', (tema) => {
    mockAberta = false;
    const { UNSAFE_root } = renderNoTema(tema, <EstablishmentDetail />);
    const pontos = UNSAFE_root.findAll(
      (n: No) => typeof n.type === 'string' && estilo(n).width === 7 && estilo(n).height === 7,
    );
    expect(pontos.length).toBeGreaterThan(0);
    expect(estilo(pontos[0]).backgroundColor).toBe(cor(tema).pessego);
    // o mesmo #FFC091 nos dois temas (no claro e o warning de antes)
    expect(estilo(pontos[0]).backgroundColor).toBe('#FFC091');
  });

  it('no escuro o pessego e o que aparece contra o fundo; o warning (marrom) nao apareceria', () => {
    expect(razao(cor('escuro').pessego, cor('escuro').background)).toBeGreaterThanOrEqual(3);
    expect(razao(cor('escuro').warning, cor('escuro').background)).toBeLessThan(3);
  });

  it.each(TEMAS)('%s: o ponto de loja aberta e green', (tema) => {
    const { UNSAFE_root } = renderNoTema(tema, <EstablishmentDetail />);
    const pontos = UNSAFE_root.findAll(
      (n: No) => typeof n.type === 'string' && estilo(n).width === 7 && estilo(n).height === 7,
    );
    expect(estilo(pontos[0]).backgroundColor).toBe('#9FE870');
  });
});

describe('EstablishmentDetail: o aviso de loja fechada', () => {
  it.each(TEMAS)('%s: onAccentPeach sobre o pessego do tema (forest sobre o marrom do escuro some)', (tema) => {
    mockAberta = false;
    const { getByText, getAllByTestId } = renderNoTema(tema, <EstablishmentDetail />);
    const aviso = getByText(/Fechada agora — escolha um profissional/);
    expect(corDe(aviso)).toBe(cor(tema).onAccentPeach);
    expect(fundoSobre(aviso)).toBe(cor(tema).warning);
    expect(razao(corDe(aviso)!, cor(tema).warning)).toBeGreaterThanOrEqual(4.5);
    // o "i" do aviso e o ultimo "i" da tela
    const infos = getAllByTestId('icone-Info');
    expect(infos[infos.length - 1].props.cor).toBe(cor(tema).onAccentPeach);
  });
});

describe('EstablishmentDetail: os botoes redondos do cabecalho', () => {
  it.each(TEMAS)('%s: sem foto o icone e o par do greenTint, e o coracao enche com a mesma cor', (tema) => {
    const { getByTestId } = renderNoTema(tema, <EstablishmentDetail />);
    expect(getByTestId('icone-Share2').props.cor).toBe(cor(tema).onGreenTint);
    const coracao = getByTestId('icone-Heart');
    expect(coracao.props.cor).toBe(cor(tema).onGreenTint);
    expect(coracao.props.preenchimento).toBe(cor(tema).onGreenTint);
    expect(fundoSobre(coracao)).toBe(cor(tema).greenTint);
    expect(razao(coracao.props.cor, cor(tema).greenTint)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEMAS)('%s: sobre a foto o icone e forest nos dois temas (o botao e branco translucido)', (tema) => {
    mockFoto = 'https://exemplo.test/loja.jpg';
    const { getByTestId, getByText } = renderNoTema(tema, <EstablishmentDetail />);
    expect(getByTestId('icone-Share2').props.cor).toBe('#163300');
    expect(getByTestId('icone-Heart').props.cor).toBe('#163300');
    // o nome da loja desce para o corpo, fora da foto: textPrimary
    expect(corDe(getByText('Barbearia'))).toBe(cor(tema).textPrimary);
  });
});

afterAll(voltarAoClaro);
