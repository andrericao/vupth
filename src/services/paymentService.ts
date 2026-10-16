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
  pendentes(accessToken: string) {
    return api.get<{ count: number; total: number | string; items: PagamentoPendente[] }>(
      '/clients/me/pending-payments',
      auth(accessToken),
    );
  },
};
