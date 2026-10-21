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

export const penaltyService = {
  listPending(accessToken: string) {
    return api.get<PendingPenaltiesResponse>('/clients/me/pending-penalties', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
