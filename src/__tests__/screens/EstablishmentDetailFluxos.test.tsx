import { Alert, Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { EstablishmentDetail } from '@screens/EstablishmentDetail';

// cobertura-98 (08/10): a tela da loja — carregando, nao achada, com foto, sem
// foto, distancia e avaliacoes, endereco com e sem mapa, menor espera, loja
// fechada e o toque nos profissionais.

const mockNavigate = jest.fn();
const mockToggle = jest.fn();
let mockLoja: Record<string, unknown> | null = null;
let mockCarregando = false;
let mockErro = false;
let mockProfs: unknown[] = [];

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { establishmentId: 'e1' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useQueueSocket', () => ({ useQueueSocket: jest.fn() }));
jest.mock('@stores/favoritesStore', () => ({
  useFavoritesStore: (sel: (s: unknown) => unknown) => sel({ ids: ['e1'], toggleFavorite: mockToggle }),
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 't', isAuthenticated: true, user: null }),
}));
jest.mock('@hooks/useEstablishments', () => ({
  useEstablishment: () => ({ data: mockLoja, isLoading: mockCarregando, isError: mockErro }),
  useProfessionalsWithQueue: () => ({ data: mockProfs }),
  useEstablishmentHours: () => ({ data: undefined }),
}));
jest.mock('@components/FotoAmpliada', () => {
  const { Text } = jest.requireActual('react-native');
  return { FotoAmpliada: ({ uri }: { uri: string | null }) => (uri ? <Text>{`ampliada:${uri}`}</Text> : null) };
});

jest.setTimeout(90000);

const LOJA = {
  id: 'e1',
  name: 'Barbearia',
  open_status: 'OPEN',
  is_open: true,
  services: [],
  ownerId: 'o1',
  urlImage: 'https://x/foto.jpg',
  status: 'ACTIVE',
  rating_average: 4.5,
  rating_count: 12,
  distance_km: 1.25,
  address: { street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'Campinas', latitude: -22, longitude: -47 },
};

const prof = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: `Prof ${id}`,
  specialty: 'barber',
  is_available: true,
  work_status: 'WORKING',
  current_attendance: null,
  waiting_list: [],
  queue_count: 0,
  estimated_wait_minutes: 0,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockLoja = { ...LOJA };
  mockCarregando = false;
  mockErro = false;
  mockProfs = [prof('a', { queue_count: 2, estimated_wait_minutes: 30 }), prof('b', { estimated_wait_minutes: 10, queue_count: 1 })];
});

describe('EstablishmentDetail — estados', () => {
  it('carregando', () => {
    mockCarregando = true;
    const { queryByText } = renderWithProviders(<EstablishmentDetail />);
    expect(queryByText('Barbearia')).toBeNull();
  });

  it('não achada', () => {
    mockErro = true;
    expect(renderWithProviders(<EstablishmentDetail />).getByText('Estabelecimento não encontrado')).toBeTruthy();
  });
});

describe('EstablishmentDetail — com foto', () => {
  it('o nome sobre a foto, avaliações e distância, e a foto ampliada', () => {
    const { getByText, getByTestId } = renderWithProviders(<EstablishmentDetail />);
    expect(getByText('Barbearia')).toBeTruthy();
    expect(getByText(/12 avaliações.*1\.3 km|12 avaliações · 1.3 km/)).toBeTruthy();
    fireEvent.press(getByTestId('foto-da-loja'));
    expect(getByText('ampliada:https://x/foto.jpg')).toBeTruthy();
  });

  it('foto quebrada cai no cabeçalho sem foto', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<EstablishmentDetail />);
    fireEvent(getByTestId('foto-da-loja-imagem'), 'error', { nativeEvent: { error: 'x' } });
    expect(queryByTestId('foto-da-loja')).toBeNull();
  });

  it('o favorito tira dos favoritos', () => {
    const { getByTestId } = renderWithProviders(<EstablishmentDetail />);
    fireEvent.press(getByTestId('favorite-button'));
    expect(mockToggle).toHaveBeenCalledWith('e1');
  });
});

describe('EstablishmentDetail — sem foto', () => {
  beforeEach(() => {
    mockLoja = { ...LOJA, urlImage: null, rating_count: null, rating_average: null };
  });

  it('só a distância, sem avaliações', () => {
    const { getByText } = renderWithProviders(<EstablishmentDetail />);
    expect(getByText(/1\.3 km|1.3 km/)).toBeTruthy();
  });

  it('sem distância e sem endereço', () => {
    mockLoja = { ...LOJA, urlImage: null, distance_km: null, address: null };
    const { queryByTestId } = renderWithProviders(<EstablishmentDetail />);
    expect(queryByTestId('endereco-da-loja')).toBeNull();
  });
});

describe('EstablishmentDetail — o endereço', () => {
  it('com mapa, o toque abre', () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const { getByTestId, getByText } = renderWithProviders(<EstablishmentDetail />);
    expect(getByText(/Como chegar/)).toBeTruthy();
    fireEvent.press(getByTestId('endereco-da-loja'));
    expect(abrir).toHaveBeenCalled();
  });
});

describe('EstablishmentDetail — os profissionais', () => {
  it('"Entrar com menor espera" leva ao de menor espera', () => {
    const { getByText } = renderWithProviders(<EstablishmentDetail />);
    fireEvent.press(getByText('Entrar com menor espera'));
    expect(mockNavigate).toHaveBeenCalledWith('serviceSelection', expect.objectContaining({ professionalId: 'b' }));
  });

  it('sem ninguém trabalhando, o botão não leva a lugar nenhum', () => {
    mockProfs = [prof('c', { work_status: 'OFF' })];
    const { queryByText } = renderWithProviders(<EstablishmentDetail />);
    const botao = queryByText('Entrar com menor espera');
    if (botao) fireEvent.press(botao);
    expect(mockNavigate).not.toHaveBeenCalledWith('serviceSelection', expect.objectContaining({ professionalId: 'c' }));
  });

  // fila-aberta-aparece-fechada (Andre, 18/10): a linha do profissional dizia
  // "Fila fechada" e, logo abaixo, o botão da loja convidava a "Entrar com menor
  // espera" — que levava para o mesmo profissional de fila fechada.
  it('quem trabalha com a fila fechada não é a "menor espera": o botão leva a quem recebe', () => {
    mockProfs = [
      prof('fechada', { accepting_new: false, queue_count: 0, estimated_wait_minutes: 0 }),
      prof('aberta', { accepting_new: true, queue_count: 3, estimated_wait_minutes: 40 }),
    ];
    const { getByText } = renderWithProviders(<EstablishmentDetail />);
    fireEvent.press(getByText('Entrar com menor espera'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'serviceSelection',
      expect.objectContaining({ professionalId: 'aberta', profissionalFora: false }),
    );
  });

  it('todos trabalhando com a fila fechada: não há botão de entrar, só escolher e agendar', () => {
    mockProfs = [prof('a', { accepting_new: false }), prof('b', { accepting_new: false })];
    const { queryByText } = renderWithProviders(<EstablishmentDetail />);
    expect(queryByText('Entrar com menor espera')).toBeNull();
  });

  it('o profissional com foto amplia a foto; a ⓘ abre as informações', () => {
    mockProfs = [prof('a', { profile_image_url: 'https://x/p.jpg' })];
    const { getByTestId, getByText } = renderWithProviders(<EstablishmentDetail />);
    fireEvent.press(getByTestId('foto-a'));
    expect(getByText('ampliada:https://x/p.jpg')).toBeTruthy();
    fireEvent.press(getByTestId('info-a'));
    expect(mockNavigate).toHaveBeenCalledWith('professionalInfo', expect.objectContaining({ professionalId: 'a' }));
  });

  it('profissional sem os campos opcionais vai com os padrões', () => {
    mockProfs = [{ id: 'z', name: 'Zeca', work_status: 'WORKING' }];
    const { getByTestId } = renderWithProviders(<EstablishmentDetail />);
    fireEvent.press(getByTestId('professional-z'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'serviceSelection',
      expect.objectContaining({ professionalName: 'Zeca', estimatedWaitMinutes: 0, queueCount: 0 }),
    );
  });
});

describe('EstablishmentDetail — fechada', () => {
  it('a linha diz Agendar, e o aviso explica', () => {
    mockLoja = { ...LOJA, open_status: 'CLOSED', is_open: false };
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getAllByText } = renderWithProviders(<EstablishmentDetail />);
    expect(getAllByText('Agendar').length).toBeGreaterThan(0);
    const fechadas = getAllByText(/Fechada agora/);
    fireEvent.press(fechadas[fechadas.length - 1]);
    expect(alerta).toHaveBeenCalledWith('Fechada agora', expect.any(String));
  });
});
