import { useRatedStore } from '@stores/ratedStore';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const RATED_KEY = 'vupth_rated_attendances';

describe('RatedStore', () => {
  beforeEach(() => {
    useRatedStore.setState({ ids: [] });
    jest.clearAllMocks();
  });

  it('markRated adiciona o id e persiste', async () => {
    await useRatedStore.getState().markRated('att-1');

    expect(useRatedStore.getState().ids).toEqual(['att-1']);
    expect(useRatedStore.getState().isRated('att-1')).toBe(true);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(RATED_KEY, JSON.stringify(['att-1']));
  });

  it('markRated é idempotente (não duplica nem re-persiste)', async () => {
    await useRatedStore.getState().markRated('att-1');
    jest.clearAllMocks();

    await useRatedStore.getState().markRated('att-1');

    expect(useRatedStore.getState().ids).toEqual(['att-1']);
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('isRated é false para id desconhecido', () => {
    expect(useRatedStore.getState().isRated('nao-avaliado')).toBe(false);
  });

  it('restoreRated carrega os ids do SecureStore', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(['a', 'b']));

    await useRatedStore.getState().restoreRated();

    expect(useRatedStore.getState().ids).toEqual(['a', 'b']);
  });

  it('restoreRated sem dados mantém vazio', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

    await useRatedStore.getState().restoreRated();

    expect(useRatedStore.getState().ids).toEqual([]);
  });

  it('restoreRated com JSON inválido não quebra', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce('{invalido');

    await useRatedStore.getState().restoreRated();

    expect(useRatedStore.getState().ids).toEqual([]);
  });
});
