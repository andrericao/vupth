import * as SecureStore from 'expo-secure-store';
import { useFavoritesStore } from '@stores/favoritesStore';

jest.mock('expo-secure-store');

const setItem = SecureStore.setItemAsync as jest.Mock;
const getItem = SecureStore.getItemAsync as jest.Mock;

describe('favoritesStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setItem.mockResolvedValue(undefined);
    useFavoritesStore.setState({ ids: [] });
  });

  it('toggleFavorite adiciona e persiste', async () => {
    await useFavoritesStore.getState().toggleFavorite('est-1');
    expect(useFavoritesStore.getState().ids).toEqual(['est-1']);
    expect(setItem).toHaveBeenCalledWith(
      'vupth_favorite_establishments',
      JSON.stringify(['est-1']),
    );
  });

  it('toggleFavorite no mesmo id REMOVE (e um toggle, nao um add)', async () => {
    await useFavoritesStore.getState().toggleFavorite('est-1');
    await useFavoritesStore.getState().toggleFavorite('est-1');
    expect(useFavoritesStore.getState().ids).toEqual([]);
  });

  it('isFavorite reflete o estado', async () => {
    expect(useFavoritesStore.getState().isFavorite('est-1')).toBe(false);
    await useFavoritesStore.getState().toggleFavorite('est-1');
    expect(useFavoritesStore.getState().isFavorite('est-1')).toBe(true);
  });

  it('falha ao gravar REVERTE o estado — a tela nao pode mentir sobre o que foi salvo', async () => {
    setItem.mockRejectedValueOnce(new Error('disco cheio'));
    await useFavoritesStore.getState().toggleFavorite('est-1');
    expect(useFavoritesStore.getState().ids).toEqual([]);
  });

  it('restoreFavorites carrega do SecureStore', async () => {
    getItem.mockResolvedValueOnce(JSON.stringify(['est-1', 'est-2']));
    await useFavoritesStore.getState().restoreFavorites();
    expect(useFavoritesStore.getState().ids).toEqual(['est-1', 'est-2']);
  });

  it('restoreFavorites com JSON invalido nao quebra', async () => {
    getItem.mockResolvedValueOnce('{{{ nao e json');
    await useFavoritesStore.getState().restoreFavorites();
    expect(useFavoritesStore.getState().ids).toEqual([]);
  });
});
