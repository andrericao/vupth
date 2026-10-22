import { api } from './api';

// Um atendimento na fila de espera (subconjunto do AttendanceInQueueResponse).
export interface QueueMember {
  id: string;
  clientId: string | null;
  clientName: string | null;
  status: string;
  scheduledTime: string;
  estimatedMinutes: number | null;
  isIntent: boolean;
  targetTime: string | null;
}

export interface QueueResponse {
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  establishmentName: string;
  size: number;
  attendancesInQueue: QueueMember[];
  totalEstimatedMinutes: number;
  totalElapsedMinutes: number;
  totalRemainingMinutes: number;
}

export interface WaitTimeResponse {
  attendanceId: string;
  clientId: string;
  position: number;
  totalQueueSize: number;
  totalEstimatedMinutes: number;
  totalRemainingMinutes: number;
  estimatedWaitingTime: number;
  /**
   * Ate quando sair da fila e de graca (D13, pedido ao Backend em 24/09).
   * Opcional: o servidor ainda nao manda — sem ele o app nao mostra janela nenhuma.
   */
  toleranceUntil?: string | null;
  /**
   * Quanto a saida custaria AGORA (D4: R$ 3 com menos de 1h, R$ 5 com 30 min
   * ou menos; 0 dentro da tolerancia). Pedido ao Backend em 17/09 — opcional:
   * sem ele, o app usa a regra que o servidor aplica hoje (R$ 3, menos de 1h).
   */
  exitPenaltyValue?: number | null;
  /** Backend 48a1dbf (DEC-104): sem atendimento concluído, sair da fila não gera multa (exitPenaltyValue vem 0). */
  penaltyExempt?: boolean;
  /** Atrasos que contam, somando atendimentos (Backend e328629) — zera no 3º, que vira multa. */
  lateCount?: number | null;
  latesUntilPenalty?: number | null;
  startTime: string;
}

export const queueService = {
  getQueue(professionalId: string, establishmentId: string, accessToken: string) {
    return api.get<QueueResponse>(
      `/client-queue/${professionalId}/queue`,
      {
        params: { establishmentId },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  },

  getWaitTime(attendanceId: string, clientId: string, accessToken: string) {
    return api.get<WaitTimeResponse>(
      `/client-queue/${attendanceId}/wait-time`,
      {
        params: { clientId },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  },
};
