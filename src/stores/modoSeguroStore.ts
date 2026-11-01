import { create } from "zustand";

// log-de-falha-na-abertura: o modo seguro desta abertura. `lido` so vira true depois que o aparelho respondeu (ou
// estourou o teto); quem desliga algo opcional espera o `lido` para nao decidir antes da hora.
interface ModoSeguroState {
  lido: boolean;
  seguro: boolean;
  quedas: number;
  definir: (seguro: boolean, quedas: number) => void;
}

export const useModoSeguroStore = create<ModoSeguroState>((set) => ({
  lido: false,
  seguro: false,
  quedas: 0,
  definir: (seguro, quedas) => set({ lido: true, seguro, quedas }),
}));
