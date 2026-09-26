import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { EstablishmentDetail } from '@screens/EstablishmentDetail';
import { useEstablishmentHours } from '@hooks/useEstablishments';
import { HorariosDaLoja } from '@domain/establishment/horarios';

// C22 — a tela da loja passa a exibir a semana. Até 17/09 ela só dizia "Aberto
// agora" / "Fechada agora", e quem chegava fora do horário não sabia quando a
// loja reabre.

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
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 't', isAuthenticated: true, user: null }),
}));
jest.mock('@hooks/useEstablishments', () => ({
  useEstablishment: () => ({
    data: { id: 'e1', name: 'Barbearia', open_status: 'OPEN', is_open: mockAberta, services: [], ownerId: 'o1', urlImage: null, status: 'ACTIVE' },
    isLoading: false,
    isError: false,
  }),
  useProfessionalsWithQueue: () => ({ data: [] }),
  useEstablishmentHours: jest.fn(),
}));

let mockAberta = true;
const mockHours = useEstablishmentHours as unknown as jest.Mock;

const HOJE = new Date();
const dia = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][HOJE.getDay()];
const iso = (d: Date) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
const AMANHA = new Date(HOJE.getTime() + 24 * 60 * 60 * 1000);
const diaAmanha = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][AMANHA.getDay()];

const horarios = (over: Partial<HorariosDaLoja> = {}): HorariosDaLoja => ({
  configured: true,
  weekly: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => ({
    day: d as never,
    closed: false,
    opens: '08:00',
    closes: '18:00',
  })),
  exceptions: [],
  upcoming: [
    { date: iso(HOJE), day: dia as never, closed: false, opens: '08:00', closes: '18:00' },
    { date: iso(AMANHA), day: diaAmanha as never, closed: false, opens: '09:00', closes: '19:00' },
  ],
  ...over,
});

describe('EstablishmentDetail — horário por dia (C22)', () => {
  beforeEach(() => {
    mockAberta = true;
    mockHours.mockReturnValue({ data: horarios() });
  });

  it('mostra o horário de HOJE, e a semana só quando se pede', () => {
    const { getByText, queryByTestId, getByTestId } = renderWithProviders(<EstablishmentDetail />);
    expect(getByText(/Hoje, 08:00 às 18:00/)).toBeTruthy();
    expect(queryByTestId('semana')).toBeNull();

    fireEvent.press(getByTestId('horario-hoje'));
    expect(getByTestId('semana')).toBeTruthy();
    expect(getByText('Domingo')).toBeTruthy();
  });

  it('fechada agora: diz QUANDO reabre — é o que a pessoa quer saber', () => {
    mockAberta = false;
    const { getByText } = renderWithProviders(<EstablishmentDetail />);
    expect(getByText(/Reabre amanhã, 09:00/)).toBeTruthy();
  });

  it('loja sem semana definida não ganha linha de horário — não se inventa', () => {
    mockHours.mockReturnValue({ data: { configured: false, weekly: [], exceptions: [], upcoming: [] } });
    const { queryByTestId } = renderWithProviders(<EstablishmentDetail />);
    expect(queryByTestId('horario-hoje')).toBeNull();
  });

  it('backend sem a rota (404): a tela segue como antes', () => {
    mockHours.mockReturnValue({ data: undefined });
    const { queryByTestId, getByText } = renderWithProviders(<EstablishmentDetail />);
    expect(queryByTestId('horario-hoje')).toBeNull();
    expect(getByText('Aberto agora')).toBeTruthy();
  });
});

describe('EstablishmentDetail — o endereço', () => {
  beforeEach(() => mockHours.mockReturnValue({ data: undefined }));

  it('sem endereço no payload, a tela não ganha linha nenhuma', () => {
    const { queryByTestId } = renderWithProviders(<EstablishmentDetail />);
    expect(queryByTestId('endereco-da-loja')).toBeNull();
  });
});
