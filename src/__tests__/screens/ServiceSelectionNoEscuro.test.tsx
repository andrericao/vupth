import { fireEvent, within } from '@testing-library/react-native';

import { ServiceSelection } from '@screens/ServiceSelection';
import { useAuthStore } from '@stores/authStore';
import { coresDoTema, veuDoTema } from '@domain/tema';
import { TEMAS, bordaSobre, corDe, fundoSobre, razao, renderNoTema, voltarAoClaro } from '../utils/nosDoisTemas';

// DEC-75: a escolha de servicos nos dois temas. O erro que isto evita: o servico
// marcado era greenTint com texto forest e a caixa forest com um check branco, e
// a explicacao das multas um painel `$white` sobre um veu preto: no escuro o
// painel seria um bloco branco com texto quase branco.

let mockMultas: unknown[] = [];

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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({
    params: {
      professionalId: 'p1',
      professionalName: 'Carlos',
      establishmentId: 'e1',
      establishmentName: 'Barbearia',
      estimatedWaitMinutes: 20,
    },
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@services/establishmentService', () => ({
  establishmentService: {
    getServiceItemsByProfessional: jest.fn().mockResolvedValue({
      data: [
        { id: 's1', customName: 'Corte', price: 30, weeklyAverageDurationInMinutes: 30 },
        { id: 's2', customName: 'Barba', price: 20, weeklyAverageDurationInMinutes: 20 },
      ],
    }),
  },
}));
jest.mock('@hooks/useEstablishments', () => ({ useSnapshotDaLoja: () => undefined }));
jest.mock('@hooks/useMultasPendentes', () => ({
  useMultasPendentes: () => ({ data: { total: 5, penalties: mockMultas } }),
}));
jest.mock('@hooks/usePendenciasAoEscolher', () => ({ usePendenciasAoEscolher: () => [] }));
// Os modais sao de outro grupo de telas: aqui so a tela.
jest.mock('@components/ScheduleModal', () => ({ ScheduleModal: () => null }));
jest.mock('@components/MoreOptionsModal', () => ({ MoreOptionsModal: () => null }));
jest.mock('@components/SaibaMaisDoPreco', () => ({ SaibaMaisDoPreco: () => null }));

jest.setTimeout(90000);

const cor = (tema: 'claro' | 'escuro') => coresDoTema(tema);

beforeEach(() => {
  mockMultas = [];
  useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
});

async function escolher(tema: 'claro' | 'escuro') {
  const tela = renderNoTema(tema, <ServiceSelection />);
  fireEvent.press(await tela.findByTestId('service-s1', {}, { timeout: 15000 }));
  return tela;
}

describe('ServiceSelection: a lista', () => {
  it.each(TEMAS)('%s: o servico marcado usa o par do greenTint; o outro, textPrimary sobre a surface', async (tema) => {
    const { getByText, getByTestId } = await escolher(tema);

    const marcado = getByText('Corte');
    expect(corDe(marcado)).toBe(cor(tema).onGreenTint);
    expect(fundoSobre(marcado)).toBe(cor(tema).greenTint);
    expect(razao(corDe(marcado)!, cor(tema).greenTint)).toBeGreaterThanOrEqual(4.5);
    // o apoio ("30 min") sobre o mesmo greenTint
    const duracao = within(getByTestId('service-s1')).getByText('30 min');
    expect(corDe(duracao)).toBe(cor(tema).textSecondary);
    expect(razao(corDe(duracao)!, cor(tema).greenTint)).toBeGreaterThanOrEqual(4.5);
    // a borda do cartao marcado e o fundo da opcao selecionada: forest no claro, green no escuro
    expect(bordaSobre(marcado)).toBe(cor(tema).selecionado);

    const livre = getByText('Barba');
    expect(corDe(livre)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(livre)).toBe(cor(tema).surface);
    expect(razao(corDe(livre)!, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEMAS)('%s: a caixa marcada e selecionado com o check do par (branco no claro)', async (tema) => {
    const { getByTestId } = await escolher(tema);
    const check = getByTestId('icone-Check');
    expect(check.props.cor).toBe(cor(tema).onSelecionadoBranco);
    expect(fundoSobre(check)).toBe(cor(tema).selecionado);
    expect(razao(check.props.cor, cor(tema).selecionado)).toBeGreaterThanOrEqual(4.5);
  });

  it('no claro e o que era: forest, check branco', async () => {
    const { getByTestId, getByText } = await escolher('claro');
    expect(corDe(getByText('Corte'))).toBe('#163300');
    expect(bordaSobre(getByText('Corte'))).toBe('#163300');
    expect(getByTestId('icone-Check').props.cor).toBe('#FFFFFF');
    expect(fundoSobre(getByTestId('icone-Check'))).toBe('#163300');
  });

  it.each(TEMAS)('%s: o nome do profissional e o "i" sao textPrimary', async (tema) => {
    const { getByText, getByTestId } = await escolher(tema);
    expect(corDe(getByText('Carlos'))).toBe(cor(tema).textPrimary);
    expect(getByTestId('icone-Info').props.cor).toBe(cor(tema).textPrimary);
  });
});

describe('ServiceSelection: o resumo (cartao forest, igual nos dois temas)', () => {
  it.each(TEMAS)('%s: os rotulos sao o branco a 70% e os valores o green sobre o forest', async (tema) => {
    const { getByText, getAllByText } = await escolher(tema);
    const rotulo = getByText('Duração estimada');
    expect(corDe(rotulo)).toBe('#FFFFFFB3');
    expect(fundoSobre(rotulo)).toBe('#163300');
    expect(corDe(getByText('O preço inclui a taxa de pagamento.'))).toBe('#FFFFFFB3');
    // o ultimo "30 min" e o valor do resumo (o primeiro e o da linha do servico)
    expect(corDe(getAllByText('30 min').slice(-1)[0])).toBe('#9FE870');
    // o rotulo translucido sobre o forest: o branco misturado a 70% e legivel
    expect(razao('#B9C2B2', '#163300')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('ServiceSelection: a explicacao das multas', () => {
  beforeEach(() => {
    mockMultas = [{ penaltyId: 'm1', type: 'LATE_CANCEL', amount: 5, originProfessionalName: 'Carlos' }];
  });

  it.each(TEMAS)('%s: painel do tema, texto do tema e o veu da Design', async (tema) => {
    const { getByTestId, getByText } = await escolher(tema);
    fireEvent.press(getByTestId('ver-multas'));

    const titulo = getByText('Multa pendente');
    expect(corDe(titulo)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(titulo)).toBe(cor(tema).painel);
    expect(razao(corDe(titulo)!, cor(tema).painel)).toBeGreaterThanOrEqual(4.5);

    const corpo = getByText('Entra no valor do seu próximo atendimento, separada do serviço.');
    expect(corDe(corpo)).toBe(cor(tema).textSecondary);
    expect(razao(corDe(corpo)!, cor(tema).painel)).toBeGreaterThanOrEqual(4.5);

    expect(corDe(getByText('R$ 5,00'))).toBe(cor(tema).textPrimary);
    // o veu atras do painel: o do tokens.json (mais denso no escuro)
    expect(fundoSobre(getByTestId('explicacao-multas'))).toBe(veuDoTema(tema));
  });

  it('no claro o painel segue branco', async () => {
    const { getByTestId, getByText } = await escolher('claro');
    fireEvent.press(getByTestId('ver-multas'));
    expect(fundoSobre(getByText('Multa pendente'))).toBe('#FFFFFF');
  });
});

afterAll(voltarAoClaro);
