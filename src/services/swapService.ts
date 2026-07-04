import { api } from './api';
import { SwapRequest } from '@domain/queue/swap';

// Item #42 — Troca de posição na fila por consentimento mútuo (cliente↔cliente).
// A propriedade do proposer é validada pelo backend contra o token.
export const swapService = {
  // Cliente A propõe trocar sua vez com a de outro cliente (B) da mesma fila.
  propose(proposerAttendanceId: string, targetAttendanceId: string, accessToken: string) {
    return api.post<SwapRequest>(
      '/swap-requests',
      { proposerAttendanceId, targetAttendanceId },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  },

  // Cliente B (alvo) aceita ou recusa a proposta.
  respond(swapRequestId: string, accept: boolean, accessToken: string) {
    return api.patch<SwapRequest>(
      `/swap-requests/${swapRequestId}`,
      null,
      { headers: { Authorization: `Bearer ${accessToken}` }, params: { accept } },
    );
  },

  // Propostas PENDING que envolvem o cliente (recebidas/enviadas).
  listMine(accessToken: string) {
    return api.get<SwapRequest[]>('/swap-requests/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
