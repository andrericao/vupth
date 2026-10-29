import { create } from 'zustand';

import type { QuedaBrusca } from '@domain/queda/quedaBrusca';

/**
 * A queda brusca aberta na tela (DEC-128): o popup do horário e, depois do "Preciso de mais tempo", as 4 opções.
 * Vive fora das telas (ModalDeQuedaBrusca, no App): o aviso chega de qualquer lugar, pelo push.
 */
type Estado = {
  queda: QuedaBrusca | null;
  /** false = o popup (Ok / Preciso de mais tempo); true = as 4 opções. */
  opcoes: boolean;
  abrir: (queda: QuedaBrusca) => void;
  /** "Preciso de mais tempo": passa às opções; `janelaAte` (do need-time) vale por cima do que o push trouxe. */
  verOpcoes: (janelaAte?: number | null) => void;
  fechar: () => void;
};

export const useQuedaBruscaStore = create<Estado>((set) => ({
  queda: null,
  opcoes: false,
  abrir: (queda) => set({ queda, opcoes: false }),
  verOpcoes: (janelaAte) =>
    set((s) => (s.queda ? { opcoes: true, queda: { ...s.queda, janelaAte: janelaAte === undefined ? s.queda.janelaAte : janelaAte } } : s)),
  fechar: () => set({ queda: null, opcoes: false }),
}));
