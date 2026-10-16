import { act, renderHook } from '@testing-library/react-native';

import { useDeviceLocation } from '@hooks/useDeviceLocation';
import { useLocationStore } from '@stores/locationStore';

// cobertura-98 (08/10): o GPS pedido na mao (seletor da Home) e o que preenche
// o formulario de endereco — permissao negada, sem bairro, GPS desligado.

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

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({ status: 'granted' });
  mockCheck.mockResolvedValue({ status: 'granted' });
  mockPosition.mockResolvedValue({ coords: { latitude: -23, longitude: -46 } });
  mockReverse.mockResolvedValue([{ city: 'São Paulo', district: 'Sé', region: 'SP', street: 'Rua X', postalCode: '01001000' }]);
  // hydrated false: a abertura nao dispara nada, so o que o teste chamar.
  useLocationStore.setState({ location: null, resolved: false, coords: null, gpsAsked: false, hydrated: false, gpsPending: false });
});

describe('useDeviceLocation — pedido na mão', () => {
  it('com permissão e bairro, define a localidade', async () => {
    const { result } = renderHook(() => useDeviceLocation());
    let ok = false;
    await act(async () => {
      ok = await result.current.requestDeviceLocation();
    });
    expect(ok).toBe(true);
    expect(useLocationStore.getState().location?.city).toBe('São Paulo');
  });

  it('permissão negada: false', async () => {
    mockRequest.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useDeviceLocation());
    let ok = true;
    await act(async () => {
      ok = await result.current.requestDeviceLocation();
    });
    expect(ok).toBe(false);
  });

  it('sem cidade no geocode: guarda a coordenada, mas false', async () => {
    mockReverse.mockResolvedValue([]);
    const { result } = renderHook(() => useDeviceLocation());
    let ok = true;
    await act(async () => {
      ok = await result.current.requestDeviceLocation();
    });
    expect(ok).toBe(false);
    expect(useLocationStore.getState().coords).toEqual({ latitude: -23, longitude: -46 });
  });

  it('GPS desligado: false', async () => {
    mockPosition.mockRejectedValue(new Error('off'));
    const { result } = renderHook(() => useDeviceLocation());
    let ok = true;
    await act(async () => {
      ok = await result.current.requestDeviceLocation();
    });
    expect(ok).toBe(false);
  });
});

describe('useDeviceLocation — preencher o endereço', () => {
  it('devolve as coordenadas e o rascunho', async () => {
    const { result } = renderHook(() => useDeviceLocation());
    let r: Awaited<ReturnType<typeof result.current.captureDeviceAddress>> = null;
    await act(async () => {
      r = await result.current.captureDeviceAddress();
    });
    expect(r).toEqual(expect.objectContaining({ coords: { latitude: -23, longitude: -46 } }));
  });

  it('permissão negada: null', async () => {
    mockRequest.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useDeviceLocation());
    let r: unknown = 'x';
    await act(async () => {
      r = await result.current.captureDeviceAddress();
    });
    expect(r).toBeNull();
  });

  it('GPS desligado: null', async () => {
    mockPosition.mockRejectedValue(new Error('off'));
    const { result } = renderHook(() => useDeviceLocation());
    let r: unknown = 'x';
    await act(async () => {
      r = await result.current.captureDeviceAddress();
    });
    expect(r).toBeNull();
  });
});

describe('useDeviceLocation — a abertura que só atualiza a coordenada', () => {
  it('GPS desligado: fica a coordenada salva', async () => {
    mockPosition.mockRejectedValue(new Error('off'));
    useLocationStore.setState({ coords: { latitude: 1, longitude: 2 } } as never);
    renderHook(() => useDeviceLocation());
    await act(async () => {
      useLocationStore.setState({ hydrated: true, gpsAsked: true });
    });
    await act(async () => {});
    expect(useLocationStore.getState().coords).toEqual({ latitude: 1, longitude: 2 });
  });
});

describe('useDeviceLocation — o que sobra (cobertura-98)', () => {
  it('a permissão retirada depois: a abertura não lê o GPS', async () => {
    mockCheck.mockResolvedValue({ status: 'denied' });
    renderHook(() => useDeviceLocation());
    await act(async () => {
      useLocationStore.setState({ hydrated: true, gpsAsked: true });
    });
    await act(async () => {});
    expect(mockCheck).toHaveBeenCalled();
    expect(mockPosition).not.toHaveBeenCalled();
  });

  it('quem já escolheu o lugar na mão: a abertura não pergunta, nem depois', async () => {
    renderHook(() => useDeviceLocation());
    await act(async () => {
      useLocationStore.setState({ hydrated: true, gpsAsked: false, resolved: true });
    });
    await act(async () => {
      useLocationStore.setState({ hydrated: false });
    });
    await act(async () => {
      useLocationStore.setState({ hydrated: true, resolved: false });
    });
    expect(mockRequest).not.toHaveBeenCalled();
    expect(useLocationStore.getState().gpsPending).toBe(false);
  });

  it('o satélite demorando: a lista de lojas para de esperar no teto', async () => {
    jest.useFakeTimers();
    try {
      mockPosition.mockReturnValue(new Promise(() => {}));
      renderHook(() => useDeviceLocation());
      await act(async () => {
        useLocationStore.setState({ hydrated: true, gpsAsked: false, resolved: false });
      });
      expect(useLocationStore.getState().gpsPending).toBe(true);
      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });
      expect(useLocationStore.getState().gpsPending).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  // Por último: troca o expo-location por um que não carrega (binário sem o módulo).
  it('binário sem o expo-location: nada pede o GPS', async () => {
    jest.resetModules();
    jest.doMock('expo-location', () => {
      throw new Error('sem módulo');
    });
    const { result } = renderHook(() => useDeviceLocation());
    let ok = true;
    let endereco: unknown = 'x';
    await act(async () => {
      ok = await result.current.requestDeviceLocation();
      endereco = await result.current.captureDeviceAddress();
      useLocationStore.setState({ hydrated: true, gpsAsked: true });
    });
    expect(ok).toBe(false);
    expect(endereco).toBeNull();
    expect(mockCheck).not.toHaveBeenCalled();
  });
});
