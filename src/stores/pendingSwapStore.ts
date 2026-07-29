import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// Contexto local das ofertas de troca publicadas de FORA da fila (F8 fatia 2).
// O backend devolve só ids (professionalId/establishmentId) — os NOMES e a
// estimativa vivem na tela onde o pedido nasceu. Guardamos aqui para (a) montar
// o card "meus pedidos" e (b) entrar na fila com os dados certos quando alguém
// aceitar (o atendimento nasce no aceite, sem passar pelo app).
const PENDING_SWAP_KEY = 'vupth_pending_swap_offers';

export interface PendingSwapContext {
  offerId: string;
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  establishmentName: string;
  estimatedWaitMinutes: number;
}

interface PendingSwapState {
  offers: PendingSwapContext[];
  addPending: (ctx: PendingSwapContext) => Promise<void>;
  removePending: (offerId: string) => Promise<void>;
  restorePending: () => Promise<void>;
}

async function persist(offers: PendingSwapContext[]) {
  await SecureStore.setItemAsync(PENDING_SWAP_KEY, JSON.stringify(offers));
}

export const usePendingSwapStore = create<PendingSwapState>((set, get) => ({
  offers: [],

  addPending: async (ctx) => {
    const offers = [...get().offers.filter((o) => o.offerId !== ctx.offerId), ctx];
    await persist(offers);
    set({ offers });
  },

  removePending: async (offerId) => {
    const offers = get().offers.filter((o) => o.offerId !== offerId);
    if (offers.length === get().offers.length) return;
    await persist(offers);
    set({ offers });
  },

  restorePending: async () => {
    try {
      const json = await SecureStore.getItemAsync(PENDING_SWAP_KEY);
      if (json) set({ offers: JSON.parse(json) });
    } catch {}
  },
}));
