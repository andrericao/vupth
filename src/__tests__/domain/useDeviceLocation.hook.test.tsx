import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDeviceLocation } from '@hooks/useDeviceLocation';
import { useLocationStore } from '@stores/locationStore';

// O GPS da abertura lia `gpsAsked` antes de o app ler o que estava salvo — e
// por isso era pedido de novo em TODA abertura, inclusive a quem já tinha
// negado a permissão (16/09).

jest.mock('expo-secure-store');

const mockRequest = jest.fn();
const mockCheck = jest.fn();
const mockPosition = jest.fn();
const mockReverse = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockRequest(),
  getForegroundPermissionsAsync: () => mockCheck(),
  getCurrentPositionAsync: () => mockPosition(),
  reverseGeocodeAsync: () => mockReverse(),
  Accuracy: { Balanced: 3 },
}));

describe('useDeviceLocation — o GPS da abertura', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({ status: 'granted' });
    mockCheck.mockResolvedValue({ status: 'granted' });
    mockPosition.mockResolvedValue({ coords: { latitude: -27.6, longitude: -48.5 } });
    mockReverse.mockResolvedValue([{ city: 'Florianópolis' }]);
    useLocationStore.setState({
      location: null,
      resolved: false,
      coords: null,
      gpsAsked: false,
      hydrated: false,
      gpsPending: false,
    });
  });

  it('não faz nada antes de ler o que estava salvo', () => {
    renderHook(() => useDeviceLocation());
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('quem JÁ foi perguntado não é perguntado de novo — só a coordenada é atualizada', async () => {
    renderHook(() => useDeviceLocation());
    act(() => useLocationStore.setState({ hydrated: true, gpsAsked: true }));

    await waitFor(() => expect(useLocationStore.getState().coords).toEqual({ latitude: -27.6, longitude: -48.5 }));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockCheck).toHaveBeenCalledTimes(1);
    // A atualização silenciosa não mexe no filtro escolhido.
    expect(useLocationStore.getState().location).toBeNull();
    expect(useLocationStore.getState().gpsPending).toBe(false);
  });

  it('permissão negada antes: nem lê a posição', async () => {
    mockCheck.mockResolvedValue({ status: 'denied' });
    renderHook(() => useDeviceLocation());
    act(() => useLocationStore.setState({ hydrated: true, gpsAsked: true }));

    await waitFor(() => expect(useLocationStore.getState().gpsPending).toBe(false));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockPosition).not.toHaveBeenCalled();
  });

  it('primeira abertura pergunta, e a lista espera enquanto o GPS responde', async () => {
    let responder: (v: unknown) => void = () => {};
    mockPosition.mockReturnValue(new Promise((r) => (responder = r)));
    renderHook(() => useDeviceLocation());
    act(() => useLocationStore.setState({ hydrated: true }));

    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    expect(useLocationStore.getState().gpsPending).toBe(true);

    await act(async () => responder({ coords: { latitude: -27.6, longitude: -48.5 } }));
    await waitFor(() => expect(useLocationStore.getState().gpsPending).toBe(false));
    expect(useLocationStore.getState().location).toEqual({ city: 'Florianópolis' });
  });
});
