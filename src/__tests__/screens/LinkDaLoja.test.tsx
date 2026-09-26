import { renderWithProviders } from '../utils/renderWithProviders';
import { EstablishmentDetail } from '@screens/EstablishmentDetail';
import { useProfessionalsWithQueue } from '@hooks/useEstablishments';

// Link compartilhado (Andre, 24/09): /loja/:id?profissional=:pid abre a loja e,
// com ela carregada, os serviços daquele profissional.
//
// (mocks iguais aos de TrabalhandoEFora)
// Contrato de 19/09 — a tela da loja recebe TODO profissional com pelo menos um
// serviço, e é o app que separa "Trabalhando" de "Fora" pelo `work_status`.
// Sem isso a tela listava quem está em casa como se atendesse, e convidava para
// uma fila que ninguém vai atender (defeito reportado pelo Partner em 07/09).

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
const mockNavigate = jest.fn();
let mockParams: Record<string, unknown> = { establishmentId: 'e1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useQueueSocket', () => ({ useQueueSocket: jest.fn() }));
jest.mock('@stores/favoritesStore', () => ({
  useFavoritesStore: (sel: (s: unknown) => unknown) => sel({ ids: [], toggle: jest.fn() }),
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ accessToken: 't', isAuthenticated: true, user: null }),
}));
jest.mock('@hooks/useEstablishments', () => ({
  useEstablishment: () => ({
    data: {
      id: 'e1',
      name: 'Barbearia',
      open_status: 'OPEN',
      is_open: true,
      services: [],
      ownerId: 'o1',
      urlImage: null,
      status: 'ACTIVE',
    },
    isLoading: false,
    isError: false,
  }),
  useProfessionalsWithQueue: jest.fn(),
  useEstablishmentHours: () => ({ data: undefined }),
}));

const mockProfs = useProfessionalsWithQueue as unknown as jest.Mock;

const prof = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: `Prof ${id}`,
  specialty: 'barber',
  is_available: true,
  current_attendance: null,
  waiting_list: [],
  queue_count: 0,
  estimated_wait_minutes: 0,
  ...over,
});

describe('EstablishmentDetail — o link do profissional', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('com ?profissional=, abre os serviços dele assim que a lista chega', () => {
    mockParams = { establishmentId: 'e1', profissional: 'b' };
    mockProfs.mockReturnValue({ data: [prof('a', { work_status: 'WORKING' }), prof('b', { work_status: 'WORKING' })] });
    renderWithProviders(<EstablishmentDetail />);
    expect(mockNavigate).toHaveBeenCalledWith('serviceSelection', expect.objectContaining({ professionalId: 'b' }));
  });

  it('profissional que não é da loja: fica na loja, sem abrir nada', () => {
    mockParams = { establishmentId: 'e1', profissional: 'zzz' };
    mockProfs.mockReturnValue({ data: [prof('a', { work_status: 'WORKING' })] });
    renderWithProviders(<EstablishmentDetail />);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('sem o parâmetro, a loja abre como sempre', () => {
    mockParams = { establishmentId: 'e1' };
    mockProfs.mockReturnValue({ data: [prof('a', { work_status: 'WORKING' })] });
    renderWithProviders(<EstablishmentDetail />);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
