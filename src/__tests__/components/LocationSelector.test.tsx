import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { LocationSelector } from '@components/LocationSelector';
import { useLocationStore } from '@stores/locationStore';
import { useAuthStore } from '@stores/authStore';

// Não deixa chamadas reais de rede/serviço escaparem no render.
jest.mock('@services/addressService', () => ({ addressService: { getMain: jest.fn() } }));
jest.mock('@utils/cep', () => ({ lookupCep: jest.fn() }));

describe('LocationSelector', () => {
  beforeEach(() => {
    useLocationStore.setState({ location: null, resolved: false });
    useAuthStore.setState({ isAuthenticated: false, accessToken: null });
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
