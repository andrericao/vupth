import { create } from 'zustand';

import { PagamentoPendente } from '@domain/pagamento/pendencia';

/**
 * O pagamento aberto na tela (pendencia-de-pagamento, CLI-30): o modal do 409
 * PAYMENT_PENDING e o do Pix vivem fora das telas (ModalDePagamento, no App),
 * porque a recusa chega da fila, do agendar e do pedido de corte.
 */
type Estado = {
  /** O 409 ao marcar: os itens para o aviso com o "Pagar". */
  aviso: PagamentoPendente[] | null;
  /** O atendimento com o Pix aberto. */
  pagando: string | null;
  /** O profissional recusou o "Já paguei": o Pix abre com o aviso para conferir o pagamento. */
  recusado: boolean;
  avisar: (itens: PagamentoPendente[]) => void;
  pagar: (attendanceId: string, recusado?: boolean) => void;
  fechar: () => void;
};

export const usePendenciaStore = create<Estado>((set) => ({
  aviso: null,
  pagando: null,
  recusado: false,
  avisar: (itens) => set({ aviso: itens, pagando: null, recusado: false }),
  pagar: (attendanceId, recusado = false) => set({ aviso: null, pagando: attendanceId, recusado }),
  fechar: () => set({ aviso: null, pagando: null, recusado: false }),
}));
