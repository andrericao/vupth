import { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useEstablishments } from '@hooks/useEstablishments';
import { establishmentService } from '@services/establishmentService';
import { useLocationStore } from '@stores/locationStore';

// Quantas vezes a lista de lojas é pedida ao abrir a Home. Até 16/09 eram duas
// ou três: a busca saía antes de o app ler as coordenadas salvas, e de novo
// quando elas chegavam.

jest.mock('expo-secure-store');
jest.mock('@services/establishmentService', () => ({
  establishmentService: { getAll: jest.fn() },
}));

const mockGetAll = establishmentService.getAll as jest.Mock;
let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useEstablishments — a busca espera a localização', () => {
  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    mockGetAll.mockReset().mockResolvedValue({ data: [{ id: 'e1' }] });
    useLocationStore.setState({
      location: null,
      resolved: false,
      coords: null,
      gpsAsked: false,
      hydrated: false,
      gpsPending: false,
    });
  });

  afterEach(() => client.clear());

  it('antes de ler o que estava salvo, não busca — e diz carregando, não "nenhuma loja"', () => {
    const { result } = renderHook(() => useEstablishments(), { wrapper });
    expect(mockGetAll).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });

  it('abertura com coordenada salva: UMA busca, já com a coordenada', async () => {
    const { result } = renderHook(() => useEstablishments(), { wrapper });
    act(() =>
      useLocationStore.setState({
        hydrated: true,
        gpsAsked: true,
        coords: { latitude: -27.59543, longitude: -48.54812 },
      }),
    );
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'e1' }]));
    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(mockGetAll).toHaveBeenCalledWith({ latitude: -27.595, longitude: -48.548 });
    expect(result.current.isLoading).toBe(false);
  });

  it('com o GPS respondendo, espera; a coordenada nova sai numa busca só', async () => {
    const { result } = renderHook(() => useEstablishments(), { wrapper });
    act(() => useLocationStore.setState({ hydrated: true, gpsPending: true }));
    expect(mockGetAll).not.toHaveBeenCalled();

    act(() =>
      useLocationStore.setState({
        coords: { latitude: -23.5505, longitude: -46.6333 },
        gpsPending: false,
      }),
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGetAll).toHaveBeenCalledTimes(1);
  });

  it('oscilação do GPS depois da busca não pede a lista de novo', async () => {
    useLocationStore.setState({
      hydrated: true,
      coords: { latitude: -27.59541, longitude: -48.54811 },
    });
    const { result } = renderHook(() => useEstablishments(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => useLocationStore.setState({ coords: { latitude: -27.59548, longitude: -48.54794 } }));
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGetAll).toHaveBeenCalledTimes(1);
  });
});
