import { api } from './api';

// Multas pendentes (Backend 389a152, em producao): cobradas no proximo
// atendimento, separadas do servico — cada uma diz de onde veio.
export interface PendingPenalty {
  penaltyId: string;
  /** LATE_CANCEL = saiu da fila · NO_SHOW = nao compareceu · LATE_ARRIVAL = 3o atraso */
  type: string;
  amount: number;
  originAttendanceId?: string | null;
  originDate?: string | null;
  originProfessionalName?: string | null;
  originEstablishmentName?: string | null;
}

export interface PendingPenaltiesResponse {
  total: number;
  penalties: PendingPenalty[];
}

// Faltas (Backend 5d04760, tres-faltas-pagar-adiantado, DEC-105/115): o "nao
// cheguei" e a saida da fila, em 90 dias. Com 3, o agendar pede o pagamento adiantado.
export interface FaltasDoCliente {
  absence_count: number;
  absence_limit: number;
  prepay_required: boolean;
}

// Pagar a multa avulso (pagar-multa-avulso, DEC-83; Backend 322c917): o Pix do app com todas as multas pendentes.
export interface PagamentoDaMulta {
  id: string;
  amount: number | string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | string;
  pix_copy_paste?: string | null;
  holder_name?: string | null;
  expires_at?: string | null;
  paid_at?: string | null;
}

export const penaltyService = {
  /** 201 com o pagamento (o vigente, se ja houver um); 409 PENALTY_NOTHING_TO_PAY; 503 PENALTY_PIX_NOT_CONFIGURED. */
  pay(accessToken: string) {
    return api.post<PagamentoDaMulta>('/clients/me/penalties/pay', undefined, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  payment(paymentId: string, accessToken: string) {
    return api.get<PagamentoDaMulta>(`/clients/me/penalties/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  absences(accessToken: string) {
    return api.get<FaltasDoCliente>('/clients/me/absences', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  listPending(accessToken: string) {
    return api.get<PendingPenaltiesResponse>('/clients/me/pending-penalties', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
