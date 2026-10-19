import { RefreshControl } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { EstablishmentList } from '@screens/EstablishmentList';
import { coresDoTema } from '@domain/tema';
import { TEMAS, corDe, estilo, fundoSobre, razao, renderNoTema, voltarAoClaro } from '../utils/nosDoisTemas';

// DEC-75: a lista de lojas nos dois temas. O erro que isto evita: o nome da loja
// em forest sobre a surface (1:1 no escuro), a busca e os icones em hex, e o
// atalho de menor espera, um cartao forest, perdendo o par do icone.

const mockNavigate = jest.fn();
let mockLista: Record<string, unknown> = {};

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
jest.mock('@components/LinhaDaLojaFechada', () => ({ LinhaDaLojaFechada: () => null }));
jest.mock('@components/NotaDaLoja', () => ({ NotaDaLoja: () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { filter: 'ALL' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useEstablishments', () => ({
  useEstablishments: () => ({
    data: [
      { id: 'e1', name: 'Barbearia Alfa', open_status: 'OPEN', is_open: true, estimated_wait_minutes: 20, distance_km: 1.2 },
      { id: 'e2', name: 'Salao Beta', open_status: 'OPEN', is_open: true, estimated_wait_minutes: 0, distance_km: 3 },
    ],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isRefetching: false,
    ...mockLista,
  }),
}));

jest.setTimeout(90000);

const cor = (tema: 'claro' | 'escuro') => coresDoTema(tema);

beforeEach(() => {
  mockNavigate.mockClear();
  mockLista = {};
});

describe('EstablishmentList: as linhas', () => {
  it.each(TEMAS)('%s: o nome e textPrimary sobre a surface e a tag e onGreen sobre o verde', (tema) => {
    const { getByText } = renderNoTema(tema, <EstablishmentList />);
    const nome = getByText('Salao Beta');
    expect(corDe(nome)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(nome)).toBe(cor(tema).surface);
    expect(razao(corDe(nome)!, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);

    const tag = getByText('Sem fila');
    // onGreen sobre green: o mesmo par nos dois temas
    expect(corDe(tag)).toBe('#163300');
    expect(fundoSobre(tag)).toBe('#9FE870');
    expect(razao(corDe(tag)!, '#9FE870')).toBeGreaterThanOrEqual(4.5);
  });

  it('no claro e o que era: forest', () => {
    const { getByText } = renderNoTema('claro', <EstablishmentList />);
    expect(corDe(getByText('Salao Beta'))).toBe('#163300');
  });
});

describe('EstablishmentList: busca, ordem e puxar para atualizar', () => {
  it.each(TEMAS)('%s: texto, placeholder e icones sao do tema', (tema) => {
    const { getByPlaceholderText, getAllByTestId, getByTestId, UNSAFE_getByType } = renderNoTema(tema, <EstablishmentList />);
    const campo = getByPlaceholderText('Buscar pelo nome');
    expect(estilo(campo).color).toBe(cor(tema).textPrimary);
    expect(campo.props.placeholderTextColor).toBe(cor(tema).textPlaceholder);
    expect(getAllByTestId('icone-Search')[0].props.cor).toBe(cor(tema).textSecondary);
    expect(getAllByTestId('icone-ArrowUpDown')[0].props.cor).toBe(cor(tema).textPrimary);
    expect(getByTestId('sort-toggle')).toBeTruthy();

    const puxar = UNSAFE_getByType(RefreshControl);
    expect(puxar.props.tintColor).toBe(cor(tema).textPrimary);
    expect(puxar.props.colors).toEqual([cor(tema).textPrimary]);
  });

  it.each(TEMAS)('%s: a ordem ativa e textPrimary sobre a surface', (tema) => {
    const { getByText } = renderNoTema(tema, <EstablishmentList />);
    const ordem = getByText('Menor espera');
    expect(corDe(ordem)).toBe(cor(tema).textPrimary);
    expect(razao(corDe(ordem)!, fundoSobre(ordem)!)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('EstablishmentList: o atalho de menor espera (cartao forest, igual nos dois temas)', () => {
  it.each(TEMAS)('%s: titulo branco e nome verde sobre o forest, e o icone onGreen sobre o disco verde', (tema) => {
    const { getByText, getAllByTestId } = renderNoTema(tema, <EstablishmentList />);
    const titulo = getByText('Entrar com menor espera');
    expect(corDe(titulo)).toBe('#FFFFFF');
    expect(fundoSobre(titulo)).toBe('#163300');
    expect(razao('#FFFFFF', '#163300')).toBeGreaterThanOrEqual(4.5);
    expect(corDe(getByText(/Salao Beta · /))).toBe('#9FE870');

    const raio = getAllByTestId('icone-Zap')[0];
    expect(raio.props.cor).toBe('#163300');
    expect(fundoSobre(raio)).toBe('#9FE870');
    expect(getAllByTestId('icone-ChevronRight')[0].props.cor).toBe('#9FE870');
  });
});

describe('EstablishmentList: estados e toques', () => {
  it.each(TEMAS)('%s: o erro de carga e danger do tema', (tema) => {
    mockLista = { isError: true };
    const { getByText } = renderNoTema(tema, <EstablishmentList />);
    expect(corDe(getByText('Erro ao carregar estabelecimentos'))).toBe(cor(tema).danger);
  });

  it('sem nenhuma loja, o aviso e o vazio', () => {
    mockLista = { data: [] };
    const { getByText } = renderNoTema('claro', <EstablishmentList />);
    expect(getByText('Nenhum estabelecimento por aqui')).toBeTruthy();
    expect(getByText('Nenhuma aberta agora')).toBeTruthy();
  });

  it('carregando, nenhuma linha', () => {
    mockLista = { isLoading: true };
    const { queryByText } = renderNoTema('escuro', <EstablishmentList />);
    expect(queryByText('Salao Beta')).toBeNull();
  });

  it.each(TEMAS)('%s: busca sem resultado diz isso em textSecondary', (tema) => {
    const { getByPlaceholderText, getByText } = renderNoTema(tema, <EstablishmentList />);
    fireEvent.changeText(getByPlaceholderText('Buscar pelo nome'), 'zzz');
    expect(corDe(getByText('Nada encontrado para essa busca'))).toBe(cor(tema).textSecondary);
  });

  it('tocar numa linha ou no atalho abre a loja; a ordem alterna', () => {
    const { getByTestId, getByText } = renderNoTema('claro', <EstablishmentList />);
    fireEvent.press(getByTestId('establishment-e2'));
    expect(mockNavigate).toHaveBeenCalledWith('establishmentDetail', { establishmentId: 'e2' });
    fireEvent.press(getByTestId('shortest-wait-shortcut'));
    expect(mockNavigate).toHaveBeenCalledWith('establishmentDetail', { establishmentId: 'e2' });
    fireEvent.press(getByTestId('sort-toggle'));
    expect(getByText('Mais perto')).toBeTruthy();
  });
});

afterAll(voltarAoClaro);
