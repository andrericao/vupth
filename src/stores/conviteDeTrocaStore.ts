import { create } from 'zustand';

import { SwapOfferResponse } from '@services/swapOfferService';

// O convite de troca na tela (D16). So em memoria: numa sessao nova, rever uma
// oferta que ainda esta aberta uma vez e aceitavel; o que nao pode e o mesmo
// popup voltar a cada poll de 20 s.
interface ConviteDeTrocaState {
  atual: SwapOfferResponse | null;
  jaMostradas: string[];
  mostrar: (oferta: SwapOfferResponse) => void;
  fechar: () => void;
}

export const useConviteDeTrocaStore = create<ConviteDeTrocaState>((set, get) => ({
  atual: null,
  jaMostradas: [],
  mostrar: (oferta) => {
    if (get().atual) return; // um de cada vez: o proximo vem no proximo poll
    set({ atual: oferta, jaMostradas: [...get().jaMostradas, oferta.id] });
  },
  fechar: () => set({ atual: null }),
}));
