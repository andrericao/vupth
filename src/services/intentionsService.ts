import { api } from './api';
import { AttendanceServiceLine } from './attendanceService';

// Item ② (Agendar = INTENÇÃO). O cliente reserva um horário PRETENDIDO futuro
// (`desiredTime`) que NÃO entra na fila viva agora — nasce com status INTENTION,
// fora da fila, e é promovido a SCHEDULED quando o fim da fila cruza o horário
// (promoção automática = pendência do backend). Criar/editar/cancelar já prontos.

export interface CreateIntentionRequest {
  professionalId: string;
  serviceItemIds: string[];
  // Horário pretendido (ISO-8601). Deve estar no futuro, dentro do expediente e
  // não antes do fim projetado da fila (o backend valida).
  desiredTime: string;
}

export interface UpdateIntentionRequest {
  desiredTime: string;
}

export interface IntentionResponse {
  id: string;
  establishmentId: string;
  establishmentName: string;
  professionalId: string;
  professionalName: string;
  clientId: string;
  clientName: string;
  services: AttendanceServiceLine[];
  status: string; // 'INTENTION' enquanto não promovido
  totalValue: number;
  estimatedMinutes: number;
  desiredTime: string; // o que o cliente pediu
  estimatedStartTime: string; // o que o sistema projeta (encaixe cronológico)
}

export const intentionsService = {
  // Erros possíveis (backend): 422 INTENTION_OUTSIDE_BUSINESS_HOURS,
  // 422 INTENTION_HORIZON_EXCEEDED (>30 dias), 422 INTENTION_BEFORE_QUEUE_END,
  // 400 (passado), 409 PROFESSIONAL_AGENDA_FULL.
  create(data: CreateIntentionRequest, accessToken: string) {
    return api.post<IntentionResponse>('/attendances/intentions', data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  // Reagenda a intenção (mesmo algoritmo do create). Só enquanto status = INTENTION.
  // Erros: 403 (não é o dono), 404, 400 (já promovido/cancelado) + os mesmos do create.
  update(intentionId: string, data: UpdateIntentionRequest, accessToken: string) {
    return api.patch<IntentionResponse>(
      `/attendances/intentions/${intentionId}`,
      data,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  },

  // Cancela a intenção (INTENTION → CANCELLED). Erros: 403, 404, 400 (já promovido/cancelado).
  cancel(intentionId: string, accessToken: string) {
    return api.delete<void>(`/attendances/intentions/${intentionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
