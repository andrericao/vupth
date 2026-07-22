import { api } from './api';

// "Solicitar corte" (BUG5 C2, backend 2026-07-22): com a loja FECHADA para novos
// (gate C1 → POST /attendances dá 409 ESTABLISHMENT_NOT_OPEN), o cliente deixa um
// pedido sob aprovação (PENDING, validade 5min). O profissional aceita (nasce um
// Attendance SCHEDULED na cauda) ou recusa; timer server-side auto-nega. O cliente
// é avisado via WS/push: CUT_ACCEPTED / CUT_REFUSED / CUT_EXPIRED.

export interface CreateCutRequest {
  professionalId: string;
  establishmentId: string;
  serviceItemIds: string[];
}

export interface CutRequestResponse {
  id: string;
  status: string; // PENDING | ACCEPTED | REFUSED | EXPIRED
  professional_id: string;
  establishment_id: string;
  client_id: string;
  service_item_ids: string[];
  expires_at: string;
  created_at: string;
  resulting_attendance_id: string | null;
}

export const cutRequestService = {
  // Erros: 409 CUT_REQUEST_NOT_ALLOWED (loja aberta agora — entrar via fila normal),
  // 422 SERVICE_ITEM_NOT_OF_PROFESSIONAL, 404, 401.
  create(data: CreateCutRequest, accessToken: string) {
    return api.post<CutRequestResponse>('/attendances/cut-requests', data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
