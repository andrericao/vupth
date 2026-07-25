import * as SecureStore from 'expo-secure-store';
import { useLocationStore, LOCATION_KEY } from '@stores/locationStore';

jest.mock('expo-secure-store');
const ss = SecureStore as jest.Mocked<typeof SecureStore>;

const loc = { city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' };

describe('locationStore', () => {
  beforeEach(() => {
    useLocationStore.setState({ location: null, resolved: false });
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
      JSON.stringify({ location: loc, resolved: true }),
    );
  });

  it('clearLocation zera a localidade mas mantém resolved=true (não volta sozinha)', async () => {
    await useLocationStore.getState().setLocation(loc);
    await useLocationStore.getState().clearLocation();

    expect(useLocationStore.getState().location).toBeNull();
    expect(useLocationStore.getState().resolved).toBe(true);
    expect(ss.setItemAsync).toHaveBeenLastCalledWith(
      LOCATION_KEY,
      JSON.stringify({ location: null, resolved: true }),
    );
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
