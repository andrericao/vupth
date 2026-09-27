import { renderWithProviders } from '../utils/renderWithProviders';
import { EstablishmentDetail } from '@screens/EstablishmentDetail';
import { useProfessionalsWithQueue } from '@hooks/useEstablishments';

// Contrato de 19/09 — a tela da loja recebe TODO profissional com pelo menos um
// serviço, e é o app que separa "Trabalhando" de "Fora" pelo `work_status`.
// Sem isso a tela listava quem está em casa como se atendesse, e convidava para
// uma fila que ninguém vai atender (defeito reportado pelo Partner em 07/09).

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
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

describe('EstablishmentDetail — Trabalhando e Fora', () => {
  it('separa as duas seções e não promete fila a quem está fora', () => {
    mockProfs.mockReturnValue({
      data: [
        prof('a', { work_status: 'WORKING', queue_count: 2, estimated_wait_minutes: 30 }),
        prof('b', { work_status: 'OFF' }),
      ],
    });

    const { getByTestId, getByText } = renderWithProviders(<EstablishmentDetail />);

    expect(getByTestId('secao-trabalhando')).toBeTruthy();
    expect(getByTestId('secao-fora')).toBeTruthy();
    expect(getByText('2 na fila')).toBeTruthy();
    // Quem está fora leva "Fila fechada" no lugar de "Sem fila · Agora".
    expect(getByText('Fila fechada')).toBeTruthy();
  });

  it('quem está em intervalo fica entre os que trabalham, com o rótulo', () => {
    mockProfs.mockReturnValue({
      data: [prof('a', { work_status: 'ON_BREAK', queue_count: 1, estimated_wait_minutes: 20 })],
    });

    const { getByText, queryByTestId } = renderWithProviders(<EstablishmentDetail />);

    expect(getByText('Em intervalo')).toBeTruthy();
    expect(getByText('1 na fila')).toBeTruthy();
    // Só "Trabalhando" na tela: o rótulo não teria contraste com nada — ruído.
    expect(queryByTestId('secao-trabalhando')).toBeNull();
  });

  it('backend antigo (sem work_status): ninguém cai em "Fora"', () => {
    mockProfs.mockReturnValue({ data: [prof('a'), prof('b')] });

    const { queryByTestId, queryByText, getByText } = renderWithProviders(<EstablishmentDetail />);

    expect(queryByTestId('secao-fora')).toBeNull();
    expect(queryByText('Fila fechada')).toBeNull();
    expect(getByText('Entrar com menor espera')).toBeTruthy();
  });

  it('todos fora: sem botão de menor espera e sem "menor espera" no cabeçalho', () => {
    mockProfs.mockReturnValue({
      data: [prof('a', { work_status: 'OFF' }), prof('b', { work_status: 'OFF' })],
    });

    const { queryByText, getByTestId } = renderWithProviders(<EstablishmentDetail />);

    // A loja segue aberta (outro pode chegar), mas não há a quem entrar.
    expect(queryByText('Entrar com menor espera')).toBeNull();
    expect(queryByText(/menor espera /)).toBeNull();
    // Sozinho, o rótulo "Fora" é o que explica por que ninguém está disponível —
    // ao contrário de um "Trabalhando" sozinho, que não diria nada.
    expect(getByTestId('secao-fora')).toBeTruthy();
  });

  it('a menor espera ignora quem está fora — a fila de quem foi embora é sempre zero', () => {
    mockProfs.mockReturnValue({
      data: [
        prof('a', { work_status: 'WORKING', queue_count: 3, estimated_wait_minutes: 45 }),
        prof('b', { work_status: 'OFF', queue_count: 0, estimated_wait_minutes: 0 }),
      ],
    });

    const { getByText } = renderWithProviders(<EstablishmentDetail />);

    expect(getByText(/menor espera 45 min/)).toBeTruthy();
  });

  // Partner 1.4.0 grava a foto; o Backend manda profile_image_url (46f1f74).
  it('o profissional com foto aparece com ela; sem foto, com as iniciais', () => {
    mockProfs.mockReturnValue({
      data: [
        prof('a', { work_status: 'WORKING', profile_image_url: 'https://cdn/a.jpg' }),
        prof('b', { work_status: 'WORKING', profile_image_url: null }),
      ],
    });
    const { UNSAFE_getAllByType, getAllByText } = renderWithProviders(<EstablishmentDetail />);
    const { Image } = jest.requireActual('react-native');
    const fotos = UNSAFE_getAllByType(Image).filter((i: { props: { source?: { uri?: string } } }) => i.props.source?.uri === 'https://cdn/a.jpg');
    expect(fotos).toHaveLength(1);
    expect(getAllByText(/^P/).length).toBeGreaterThan(0);
  });

  // Andre, 26/09: tocar na foto abre com zoom.
  it('tocar na foto do profissional abre a foto em tela cheia', () => {
    const { fireEvent } = jest.requireActual('@testing-library/react-native');
    mockProfs.mockReturnValue({ data: [prof('a', { work_status: 'WORKING', profile_image_url: 'https://cdn/a.jpg' })] });
    const { getByTestId, queryByTestId } = renderWithProviders(<EstablishmentDetail />);
    expect(queryByTestId('foto-ampliada-imagem')).toBeNull();
    fireEvent.press(getByTestId('foto-a'));
    expect(getByTestId('foto-ampliada-imagem').props.source).toEqual({ uri: 'https://cdn/a.jpg' });
    fireEvent.press(getByTestId('foto-ampliada'));
    expect(queryByTestId('foto-ampliada-imagem')).toBeNull();
  });
});
