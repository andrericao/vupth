import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import { devePedirFeedback } from '@domain/feedback/feedback';

// pedido-de-feedback (CLI-34): quando a caixa abriu e quando a pessoa tocou em
// "Enviar feedback" — as duas datas decidem se pede de novo (30 e 90 dias).
// Persistido: fechar o app nao pode zerar o intervalo.
const FEEDBACK_KEY = 'vupth_feedback_pedido';

type Datas = { ultimoPedido: number | null; ultimoEnvio: number | null };

interface FeedbackState extends Datas {
  /** A caixa esta na tela. */
  aberto: boolean;
  /** Abre a caixa se o intervalo permitir. Devolve se abriu. */
  pedir: (agora?: number) => boolean;
  /** "Agora não". */
  fechar: () => void;
  /** "Enviar feedback": a caixa fecha e a data do envio vale por 90 dias. */
  enviar: (agora?: number) => void;
  restoreFeedback: () => Promise<void>;
}

async function guardar(d: Datas) {
  try {
    await SecureStore.setItemAsync(FEEDBACK_KEY, JSON.stringify(d));
  } catch {
    // Sem disco, o intervalo vale so nesta sessao.
  }
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  ultimoPedido: null,
  ultimoEnvio: null,
  aberto: false,

  pedir: (agora = Date.now()) => {
    const { ultimoPedido, ultimoEnvio } = get();
    if (!devePedirFeedback(agora, ultimoPedido, ultimoEnvio)) return false;
    set({ aberto: true, ultimoPedido: agora });
    void guardar({ ultimoPedido: agora, ultimoEnvio });
    return true;
  },

  fechar: () => set({ aberto: false }),

  enviar: (agora = Date.now()) => {
    const { ultimoPedido } = get();
    set({ aberto: false, ultimoEnvio: agora });
    void guardar({ ultimoPedido, ultimoEnvio: agora });
  },

  restoreFeedback: async () => {
    try {
      const json = await SecureStore.getItemAsync(FEEDBACK_KEY);
      if (json) {
        const d = JSON.parse(json) as Partial<Datas>;
        set({ ultimoPedido: d.ultimoPedido ?? null, ultimoEnvio: d.ultimoEnvio ?? null });
      }
    } catch {
      // Primeira abertura, ou disco bloqueado.
    }
  },
}));
