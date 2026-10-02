import { api } from './api';

export interface CreateAttendanceRequest {
  professionalId: string;
  establishmentId: string;
  serviceItemIds: string[];
  scheduledTime?: string;
  // Item #40: quando presente, o cliente entra como INTENÇÃO com horário-alvo
  // (cede a vez aos walk-ins até o previsto encostar no alvo). ISO-8601.
  targetTime?: string;
}

export interface AttendanceResponse {
  id: string;
  clientId: string;
  professionalId: string;
  establishmentId: string;
  status: string;
  scheduledTime: string;
  // Backend 782db11 (26/09): o horario pedido (targetTime) caiu numa refeicao e
  // o atendimento foi para depois dela — scheduledTime e o horario real.
  placedAfterBreak?: boolean;
}

export interface CancelAttendanceResponse {
  id: string;
  status: string;
}

export interface AttendanceServiceLine {
  id: string;
  customName: string;
  estimatedMinutes: number;
}

export interface ClientAttendance {
  id: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  services: AttendanceServiceLine[];
  status: string;
  totalValue: number;
  scheduledTime: string;
  startTime: string | null;
  endTime: string | null;
  durationInMinutes: number | null;
  /** Ja tem nota (Backend 3925ec3). Ausente = backend anterior: vale o ratedStore. */
  rated?: boolean;
}

export interface ClientAttendanceFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Resposta dos remanejamentos de fila (Item 16): reschedule / move-to-end.
// É o próprio AttendanceInQueueResponse do backend (com isIntent/targetTime).
export interface AttendanceInQueueResponse {
  id: string;
  clientId: string;
  professionalId: string;
  establishmentId: string;
  status: string;
  scheduledTime: string;
  isIntent?: boolean;
  targetTime?: string | null;
  placedAfterBreak?: boolean;
}

export const attendanceService = {
  create(data: CreateAttendanceRequest, accessToken: string) {
    return api.post<AttendanceResponse>('/attendances', data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  // Ciencia da multa (Backend 0caf229, em producao desde 26/09): se sair agora
  // custa algo, o servidor so aceita com o valor que o cliente confirmou —
  // sem ele, 409 EXIT_PENALTY_NOT_ACKNOWLEDGED e o cliente continua na fila.
  cancel(attendanceId: string, accessToken: string, acknowledgedPenalty?: number) {
    return api.put<CancelAttendanceResponse>(
      `/attendances/${attendanceId}/cancel`,
      null,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        ...(acknowledgedPenalty != null && acknowledgedPenalty > 0
          ? { params: { acknowledgedPenalty: acknowledgedPenalty.toFixed(2) } }
          : {}),
      },
    );
  },

  listClientHistory(accessToken: string, filters?: ClientAttendanceFilters) {
    return api.get<ClientAttendance[]>('/attendances/client/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: filters,
    });
  },

  // Item 16 — espera longa: reagenda a vez para um horário (targetTime ISO-8601).
  // O atendimento vira intenção de fila. Erros: 422 (alvo inviável), 400 (passado),
  // 403 (não é o dono), 400 (status != SCHEDULED).
  reschedule(attendanceId: string, targetTimeISO: string, accessToken: string) {
    return api.patch<AttendanceInQueueResponse>(
      `/attendances/${attendanceId}/reschedule`,
      null,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { targetTime: targetTimeISO },
      },
    );
  },

  // Adiantado por desistencia (Backend d959214): aceitar o horario novo. Ele
  // vira o prometido e o atraso passa a contar dele. Recusar = nao chamar nada.
  acceptEarlierTurn(attendanceId: string, accessToken: string) {
    return api.patch<{ attendanceId: string; promisedTime: string }>(
      `/attendances/${attendanceId}/accept-earlier-turn`,
      null,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  },

  // Item 16 — espera longa: desce a vez para o fim da fila (sem sair, sem strike).
  // No-op se já for o último. Erros: 403 (não é o dono), 400 (status != SCHEDULED).
  moveToEnd(attendanceId: string, accessToken: string) {
    return api.patch<AttendanceInQueueResponse>(
      `/attendances/${attendanceId}/move-to-end`,
      null,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  },
};
