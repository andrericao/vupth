import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import { passoValido } from '@domain/fonte';

// O passo da letra escolhido nas Configuracoes — fica no aparelho.
const CHAVE = 'vupth_passo_da_fonte';

interface FonteState {
  passo: number;
  escolher: (passo: number) => Promise<void>;
  restaurar: () => Promise<void>;
}

export const useFonteStore = create<FonteState>((set) => ({
  passo: 0,
  escolher: async (passo) => {
    const p = passoValido(passo);
    set({ passo: p });
    try {
      await SecureStore.setItemAsync(CHAVE, String(p));
    } catch {}
  },
  restaurar: async () => {
    try {
      set({ passo: passoValido(await SecureStore.getItemAsync(CHAVE)) });
    } catch {}
  },
}));

/** Tamanho escrito direto na tela (fontSize={13}) somado ao passo escolhido. */
export function fs(tamanho: number): number {
  return tamanho + useFonteStore.getState().passo;
}
