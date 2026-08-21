import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// IDs dos estabelecimentos que o cliente marcou como favoritos.
//
// ⚠️ SO NO APARELHO, e de proposito: o backend NAO tem favorito (nao ha
// endpoint nenhum — o "Seu de sempre" da Home e derivado do historico
// justamente por isso). Enquanto nao existir, o coracao guarda aqui: some se
// a pessoa trocar de celular ou reinstalar, e nao sincroniza entre aparelhos.
//
// Quando o backend expuser favoritos, este store vira cache/fallback da fonte
// da verdade — mesma trajetoria do `ratedStore`, que nasceu pelo mesmo motivo.
const FAVORITES_KEY = 'vupth_favorite_establishments';

interface FavoritesState {
  ids: string[];
  isFavorite: (establishmentId: string) => boolean;
  toggleFavorite: (establishmentId: string) => Promise<void>;
  restoreFavorites: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: [],

  isFavorite: (establishmentId) => get().ids.includes(establishmentId),

  toggleFavorite: async (establishmentId) => {
    const atual = get().ids;
    const ids = atual.includes(establishmentId)
      ? atual.filter((id) => id !== establishmentId)
      : [...atual, establishmentId];
    // Estado primeiro: o coracao responde ao toque na hora. A escrita no
    // SecureStore e lenta o bastante pra dar um atraso perceptivel se
    // esperarmos por ela antes de pintar.
    set({ ids });
    try {
      await SecureStore.setItemAsync(FAVORITES_KEY, JSON.stringify(ids));
    } catch {
      // Falhou gravar: reverte, senao a tela mente sobre o que foi salvo.
      set({ ids: atual });
    }
  },

  restoreFavorites: async () => {
    try {
      const json = await SecureStore.getItemAsync(FAVORITES_KEY);
      if (json) set({ ids: JSON.parse(json) });
    } catch {}
  },
}));
