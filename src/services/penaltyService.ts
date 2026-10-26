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

export const penaltyService = {
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
