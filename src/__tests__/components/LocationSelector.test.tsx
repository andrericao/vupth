import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { LocationSelector } from '@components/LocationSelector';
import { useLocationStore } from '@stores/locationStore';
import { useAuthStore } from '@stores/authStore';

// Não deixa chamadas reais de rede/serviço escaparem no render.
jest.mock('@services/addressService', () => ({ addressService: { getMain: jest.fn() } }));
jest.mock('@utils/cep', () => ({ lookupCep: jest.fn() }));
// O GPS é nativo: aqui só interessa que o botão exista e chame o hook (o fluxo
// de permissão/reverse geocode é testado puro em `gps.test.ts`).
const mockRequestDeviceLocation = jest.fn().mockResolvedValue(true);
jest.mock('@hooks/useDeviceLocation', () => ({
  useDeviceLocation: () => ({ requestDeviceLocation: mockRequestDeviceLocation }),
}));

describe('LocationSelector', () => {
  beforeEach(() => {
    useLocationStore.setState({ location: null, resolved: false, coords: null, gpsAsked: false });
    useAuthStore.setState({ isAuthenticated: false, accessToken: null });
    mockRequestDeviceLocation.mockClear();
  });

  it('botão de GPS aparece para todos e dispara o pedido de localização', async () => {
    const { getByText, getByTestId } = renderWithProviders(<LocationSelector />);
    fireEvent.press(getByText('Escolher meu bairro'));

    fireEvent.press(getByTestId('use-gps'));

    expect(mockRequestDeviceLocation).toHaveBeenCalled();
  });

  it('sem localidade → mostra "Escolher meu bairro"', () => {
    const { getByText } = renderWithProviders(<LocationSelector />);
    expect(getByText('Escolher meu bairro')).toBeTruthy();
  });

  it('com localidade → mostra "bairro, cidade"', () => {
    useLocationStore.setState({
      location: { city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' },
      resolved: true,
    });
    const { getByText } = renderWithProviders(<LocationSelector />);
    expect(getByText('Centro, Florianópolis')).toBeTruthy();
  });

  it('visitante: modal abre com CEP e SEM "usar meu endereço"', () => {
    const { getByText, queryByText, getByPlaceholderText } = renderWithProviders(<LocationSelector />);
    fireEvent.press(getByText('Escolher meu bairro'));

    expect(getByText('Sua localização')).toBeTruthy();
    expect(getByPlaceholderText('CEP (ex.: 88010-000)')).toBeTruthy();
    expect(queryByText('Usar meu endereço cadastrado')).toBeNull();
  });

  it('logado: modal mostra "usar meu endereço"; com localidade, mostra "Ver todos"', () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    useLocationStore.setState({
      location: { city: 'Fortaleza', neighborhood: 'Aldeota', state: 'CE' },
      resolved: true,
    });
    const { getByText } = renderWithProviders(<LocationSelector />);
    fireEvent.press(getByText('Aldeota, Fortaleza'));

    expect(getByText('Usar meu endereço cadastrado')).toBeTruthy();
    expect(getByText('Ver todos (remover filtro)')).toBeTruthy();
  });
});
