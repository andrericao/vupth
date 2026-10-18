import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { LocationSelector } from '@components/LocationSelector';
import { useLocationStore } from '@stores/locationStore';
import { useAuthStore } from '@stores/authStore';

// cobertura-98 (08/10): os três caminhos da localização (endereço cadastrado,
// GPS e CEP), com o que dá errado em cada um, e o "Ver todos".

const mockGetMain = jest.fn();
const mockLookupCep = jest.fn();
const mockRequest = jest.fn();

jest.mock('expo-secure-store');
jest.mock('@services/addressService', () => ({ addressService: { getMain: (...a: unknown[]) => mockGetMain(...a) } }));
jest.mock('@utils/cep', () => ({
  ...jest.requireActual('@utils/cep'),
  lookupCep: (...a: unknown[]) => mockLookupCep(...a),
}));
jest.mock('@hooks/useDeviceLocation', () => ({
  useDeviceLocation: () => ({ requestDeviceLocation: (...a: unknown[]) => mockRequest(...a) }),
}));

jest.setTimeout(90000);

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useLocationStore.setState({ location: null, resolved: false, coords: null, gpsAsked: false });
  useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
  mockGetMain.mockResolvedValue({ data: { city: 'Campinas', neighborhood: 'Centro', state: 'SP' } });
  mockLookupCep.mockResolvedValue({ city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' });
  mockRequest.mockResolvedValue(true);
});

function abrir() {
  const tela = renderWithProviders(<LocationSelector />);
  fireEvent.press(tela.getByText('Escolher meu bairro'));
  return tela;
}

describe('LocationSelector — endereço cadastrado', () => {
  it('usa a cidade do endereço principal e fecha', async () => {
    const tela = abrir();
    await act(async () => {
      fireEvent.press(tela.getByText('Usar endereço'));
    });
    await waitFor(() => expect(useLocationStore.getState().location?.city).toBe('Campinas'));
    expect(tela.queryByText('Sua localização')).toBeNull();
  });

  it('sem endereço avisa', async () => {
    mockGetMain.mockResolvedValue({ data: null });
    const tela = abrir();
    await act(async () => {
      fireEvent.press(tela.getByText('Usar endereço'));
    });
    expect(alertSpy).toHaveBeenCalledWith('Sem endereço', expect.any(String));
  });

  it('erro ao ler avisa', async () => {
    mockGetMain.mockRejectedValue(new Error('x'));
    const tela = abrir();
    await act(async () => {
      fireEvent.press(tela.getByText('Usar endereço'));
    });
    expect(alertSpy).toHaveBeenCalledWith('Erro', 'Não foi possível ler seu endereço cadastrado.');
  });
});

describe('LocationSelector — GPS', () => {
  it('com a localização, fecha', async () => {
    const tela = abrir();
    await act(async () => {
      fireEvent.press(tela.getByTestId('use-gps'));
    });
    expect(tela.queryByText('Sua localização')).toBeNull();
  });

  it('sem a localização, avisa e fica aberto', async () => {
    mockRequest.mockResolvedValue(false);
    const tela = abrir();
    await act(async () => {
      fireEvent.press(tela.getByTestId('use-gps'));
    });
    expect(alertSpy).toHaveBeenCalledWith('Não consegui sua localização', expect.any(String));
    expect(tela.getByText('Sua localização')).toBeTruthy();
  });
});

describe('LocationSelector — CEP', () => {
  it('CEP achado vira o filtro', async () => {
    const tela = abrir();
    fireEvent.changeText(tela.getByPlaceholderText('CEP (ex.: 88010-000)'), '88010000');
    await act(async () => {
      fireEvent.press(tela.getByText('Usar este CEP'));
    });
    await waitFor(() => expect(useLocationStore.getState().location?.city).toBe('Florianópolis'));
  });

  it('CEP não achado avisa', async () => {
    mockLookupCep.mockResolvedValue(null);
    const tela = abrir();
    fireEvent.changeText(tela.getByPlaceholderText('CEP (ex.: 88010-000)'), '99999999');
    await act(async () => {
      fireEvent.press(tela.getByText('Usar este CEP'));
    });
    expect(alertSpy).toHaveBeenCalledWith('CEP não encontrado', expect.any(String));
  });
});

describe('LocationSelector — com filtro', () => {
  it('"Ver todos" tira o filtro e fecha; "Fechar" só fecha', () => {
    useLocationStore.setState({ location: { city: 'Campinas', neighborhood: '', state: 'SP' }, resolved: true });
    const tela = renderWithProviders(<LocationSelector />);
    fireEvent.press(tela.getByText('Campinas'));
    fireEvent.press(tela.getByText('Ver todos (remover filtro)'));
    expect(useLocationStore.getState().location).toBeNull();

    fireEvent.press(tela.getByText('Escolher meu bairro'));
    fireEvent.press(tela.getByText('Fechar'));
    expect(tela.queryByText('Sua localização')).toBeNull();
  });
});
