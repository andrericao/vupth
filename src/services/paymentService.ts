import { api } from './api';
import { Pagamento, PagamentoPendente } from '@domain/pagamento/pendencia';

// Pagamento por Pix (Backend 2a2b0ec + adendos): o valor, o copia-e-cola e o
// "Já paguei" (claim). Quem confirma o "Recebi" e o profissional.
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export const paymentService = {
  get(attendanceId: string, accessToken: string) {
    return api.get<Pagamento>(`/attendances/${attendanceId}/payment`, auth(accessToken));
  },
  claim(attendanceId: string, accessToken: string) {
    return api.post<Pagamento>(`/attendances/${attendanceId}/payment/claim`, undefined, auth(accessToken));
  },
  // confirmar-ou-contestar-recebi (F4, BAK-16): so o cliente do atendimento; 409 PAYMENT_INVALID_STATUS no resto.
  acknowledge(attendanceId: string, accessToken: string) {
    return api.post<Pagamento>(`/attendances/${attendanceId}/payment/acknowledge`, undefined, auth(accessToken));
  },
  contest(attendanceId: string, accessToken: string, reason?: string) {
    return api.post<Pagamento>(
      `/attendances/${attendanceId}/payment/contest`,
      reason?.trim() ? { reason: reason.trim().slice(0, 300) } : undefined,
      auth(accessToken),
    );
  },
  pendentes(accessToken: string) {
    return api.get<{ count: number; total: number | string; items: PagamentoPendente[] }>(
      '/clients/me/pending-payments',
      auth(accessToken),
    );
  },
};
