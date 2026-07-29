import * as SecureStore from 'expo-secure-store';
import { useLocationStore, LOCATION_KEY } from '@stores/locationStore';

jest.mock('expo-secure-store');
const ss = SecureStore as jest.Mocked<typeof SecureStore>;

const loc = { city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' };

const coords = { latitude: -27.5954, longitude: -48.548 };

describe('locationStore', () => {
  beforeEach(() => {
    useLocationStore.setState({ location: null, resolved: false, coords: null, gpsAsked: false });
    jest.clearAllMocks();
    ss.setItemAsync.mockResolvedValue(undefined);
    ss.deleteItemAsync.mockResolvedValue(undefined);
  });

  it('setLocation grava a localidade + resolved=true e persiste', async () => {
    await useLocationStore.getState().setLocation(loc);

    expect(useLocationStore.getState().location).toEqual(loc);
    expect(useLocationStore.getState().resolved).toBe(true);
    expect(ss.setItemAsync).toHaveBeenCalledWith(
      LOCATION_KEY,
      JSON.stringify({ location: loc, resolved: true, coords: null, gpsAsked: false }),
    );
  });

  it('clearLocation zera a localidade mas mantém resolved=true (não volta sozinha)', async () => {
    await useLocationStore.getState().setLocation(loc);
    await useLocationStore.getState().clearLocation();

    expect(useLocationStore.getState().location).toBeNull();
    expect(useLocationStore.getState().resolved).toBe(true);
    expect(ss.setItemAsync).toHaveBeenLastCalledWith(
      LOCATION_KEY,
      JSON.stringify({ location: null, resolved: true, coords: null, gpsAsked: false }),
    );
  });

  // GPS (Fase 3): as coordenadas são o dado do device — sobrevivem ao "Ver
  // todos" e ficam guardadas para o dia do `?lat&lng&radiusKm` (B7).
  it('setCoords guarda as coordenadas sem mexer no filtro', async () => {
    await useLocationStore.getState().setCoords(coords);

    expect(useLocationStore.getState().coords).toEqual(coords);
    expect(useLocationStore.getState().resolved).toBe(false);
  });

  it('clearLocation NÃO descarta as coordenadas do device', async () => {
    await useLocationStore.getState().setCoords(coords);
    await useLocationStore.getState().clearLocation();

    expect(useLocationStore.getState().coords).toEqual(coords);
  });

  it('markGpsAsked marca que já perguntamos (não re-perguntar a cada abertura)', async () => {
    await useLocationStore.getState().markGpsAsked();

    expect(useLocationStore.getState().gpsAsked).toBe(true);
    expect(ss.setItemAsync).toHaveBeenLastCalledWith(
      LOCATION_KEY,
      JSON.stringify({ location: null, resolved: false, coords: null, gpsAsked: true }),
    );
  });

  it('restoreLocation traz coords e gpsAsked de volta', async () => {
    ss.getItemAsync.mockResolvedValueOnce(
      JSON.stringify({ location: loc, resolved: true, coords, gpsAsked: true }),
    );

    await useLocationStore.getState().restoreLocation();

    expect(useLocationStore.getState().coords).toEqual(coords);
    expect(useLocationStore.getState().gpsAsked).toBe(true);
  });

  it('restoreLocation carrega location + resolved do SecureStore', async () => {
    ss.getItemAsync.mockResolvedValueOnce(JSON.stringify({ location: loc, resolved: true }));

    await useLocationStore.getState().restoreLocation();

    expect(useLocationStore.getState().location).toEqual(loc);
    expect(useLocationStore.getState().resolved).toBe(true);
  });

  it('restore sem nada salvo mantém o default (null / não resolvido)', async () => {
    ss.getItemAsync.mockResolvedValueOnce(null);

    await useLocationStore.getState().restoreLocation();

    expect(useLocationStore.getState().location).toBeNull();
    expect(useLocationStore.getState().resolved).toBe(false);
  });

  it('JSON inválido no restore não quebra', async () => {
    ss.getItemAsync.mockResolvedValueOnce('{quebrado');

    await expect(useLocationStore.getState().restoreLocation()).resolves.toBeUndefined();
    expect(useLocationStore.getState().location).toBeNull();
  });
});
