import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import { PedidoDeCorte } from '@domain/queue/pedidoDeCorte';

// Pedidos de corte que esperam resposta. Persistidos: fechar o app nos 5
// minutos do pedido nao pode fazer a resposta se perder. Mesmo formato do
// `pendingSwapStore`.
const PEDIDOS_KEY = 'vupth_pedidos_de_corte';

interface PedidoDeCorteState {
  pedidos: PedidoDeCorte[];
  adicionar: (pedido: PedidoDeCorte) => Promise<void>;
  remover: (id: string) => Promise<void>;
  /** Quando so se sabe o profissional (evento do WebSocket sem o id). */
  removerDoProfissional: (professionalId: string) => Promise<void>;
  restaurar: () => Promise<void>;
}

async function persistir(pedidos: PedidoDeCorte[]) {
  try {
    await SecureStore.setItemAsync(PEDIDOS_KEY, JSON.stringify(pedidos));
  } catch {
    // Sem disco o pedido segue na memoria; perder a persistencia e melhor que
    // perder o aviso desta sessao.
  }
}

export const usePedidoDeCorteStore = create<PedidoDeCorteState>((set, get) => ({
  pedidos: [],

  adicionar: async (pedido) => {
    // Um pedido por profissional: o novo substitui o anterior.
    const pedidos = [
      ...get().pedidos.filter((p) => p.id !== pedido.id && p.professionalId !== pedido.professionalId),
      pedido,
    ];
    set({ pedidos });
    await persistir(pedidos);
  },

  remover: async (id) => {
    const pedidos = get().pedidos.filter((p) => p.id !== id);
    if (pedidos.length === get().pedidos.length) return;
    set({ pedidos });
    await persistir(pedidos);
  },

  removerDoProfissional: async (professionalId) => {
    const pedidos = get().pedidos.filter((p) => p.professionalId !== professionalId);
    if (pedidos.length === get().pedidos.length) return;
    set({ pedidos });
    await persistir(pedidos);
  },

  restaurar: async () => {
    try {
      const json = await SecureStore.getItemAsync(PEDIDOS_KEY);
      if (json) set({ pedidos: JSON.parse(json) });
    } catch {}
  },
}));
