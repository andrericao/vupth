import { renderWithProviders } from '../utils/renderWithProviders';
import { EstablishmentRow } from '@screens/Home';
import { Establishment } from '@domain/establishment/types';

// distancia-e-nota-no-card (Andre, 09/10): "a distancia do estabelecimento e a
// avaliacao devem aparecer no card da home". A nota tinha saido no redesenho
// de 16/08 (7344e150); a distancia so aparece quando o servidor a manda (GPS).

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useScrollToTop: jest.fn(),
}));

jest.setTimeout(90000);

function loja(extra: Partial<Establishment> = {}): Establishment {
  return {
    id: 'e1',
    name: 'Barbearia do Zé',
    ownerId: 'o1',
    urlImage: null,
    serviceType: 'BARBER',
    open_status: 'OPEN',
    is_open: true,
    status: 'ACTIVE',
    services: [],
    estimated_wait_minutes: 0,
    ...extra,
  } as Establishment;
}

describe('o card da loja na Home', () => {
  it('mostra a nota (a melhor da loja) e a distância', async () => {
    const { findByText, getByText, getByTestId } = renderWithProviders(
      <EstablishmentRow establishment={loja({ rating_best: 4.8, rating_average: 4.2 })} distanceKm={1.25} onPress={jest.fn()} />,
    );
    expect(await findByText('4.8', {}, { timeout: 15000 })).toBeTruthy();
    expect(getByTestId('nota-e1')).toBeTruthy();
    expect(getByText("1,3 km")).toBeTruthy();
  });

  it('sem nota no servidor, usa a média; sem GPS, a distância some e a loja fica', async () => {
    const { findByText, queryByText } = renderWithProviders(
      <EstablishmentRow establishment={loja({ rating_average: 4.5 })} distanceKm={null} onPress={jest.fn()} />,
    );
    expect(await findByText('4.5', {}, { timeout: 15000 })).toBeTruthy();
    expect(queryByText(/km/)).toBeNull();
    expect(queryByText('Barbearia do Zé')).toBeTruthy();
  });
});
