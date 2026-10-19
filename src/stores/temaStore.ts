import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import { preferenciaValida, type Preferencia } from '@domain/tema';

// A escolha de Configuracoes > Aparencia > Tema fica no aparelho, como o
// tamanho da letra (fonteStore.ts). O PADRAO e claro: quem nunca abriu a tela
// continua vendo o app como sempre viu, e uma chave ausente ou corrompida nunca
// liga o escuro sozinha.
const CHAVE = 'vupth_tema';

// Um cofre que nao responde nunca pode prender o app: passado o limite a leitura
// desiste e o app segue no padrao (claro).
export const LIMITE_DA_LEITURA_MS = 1500;

function comLimite<T>(leitura: Promise<T>, ms: number): Promise<T | null> {
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const estouro = new Promise<null>((resolve) => {
    relogio = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([leitura, estouro]).finally(() => clearTimeout(relogio));
}

interface TemaState {
  preferencia: Preferencia;
  escolher: (preferencia: Preferencia) => Promise<void>;
  restaurar: () => Promise<void>;
}

export const useTemaStore = create<TemaState>((set) => ({
  preferencia: 'claro',
  escolher: async (preferencia) => {
    const p = preferenciaValida(preferencia);
    set({ preferencia: p });
    try {
      await SecureStore.setItemAsync(CHAVE, p);
    } catch {}
  },
  restaurar: async () => {
    try {
      const guardado = await comLimite(SecureStore.getItemAsync(CHAVE), LIMITE_DA_LEITURA_MS);
      set({ preferencia: preferenciaValida(guardado) });
    } catch {
      // Sem acesso ao cofre do aparelho o app abre no padrao (claro).
    }
  },
}));
