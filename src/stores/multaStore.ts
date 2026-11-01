import { create } from 'zustand';

/**
 * A tela "Pagar multa" (pagar-multa-avulso, DEC-83): vive fora das telas (ModalDePagarMulta, no App), porque o
 * caminho chega do aviso do limite de multas (409 PENALTY_LIMIT_REACHED, nos três portões de entrada) e do
 * "Multa pendente" da escolha de serviços.
 */
type Estado = {
  aberta: boolean;
  abrir: () => void;
  fechar: () => void;
};

export const useMultaStore = create<Estado>((set) => ({
  aberta: false,
  abrir: () => set({ aberta: true }),
  fechar: () => set({ aberta: false }),
}));
