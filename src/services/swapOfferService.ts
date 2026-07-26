import { api } from './api';

// Oferta ABERTA de troca de posição na fila viva (Client C13 — backend fatia 1
// entregue 2026-07-24, solicitante NA fila). Adiantar = EARLIER (aparece p/ quem
// está à frente); Atrasar = LATER (aparece p/ quem está atrás). Nunca gera multa;
// expira quando o solicitante é atendido/cancela. Fatia 2 (solicitante fora da
// fila) ainda dá 422 QUEUE_SWAP_OFFER_NOT_ALLOWED.
export type SwapOfferDirection = 'EARLIER' | 'LATER';
export type SwapOfferStatus = 'OPEN' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';

export interface CreateSwapOfferRequest {
  attendanceId: string;
  direction: SwapOfferDirection;
}

// Espelha SwapOfferResponse do backend. Sem nome do solicitante — a UI usa a
// direção para o texto (não revela quem é).
export interface SwapOfferResponse {
  id: string;
  status: SwapOfferStatus;
  direction: SwapOfferDirection;
  requesterClientId: string | null;
  requesterAttendanceId: string | null;
  professionalId: string;
  establishmentId: string;
  serviceItemIds: string[];
  resultingAttendanceId: string | null;
  createdAt: string;
  respondedAt: string | null;
}

export const swapOfferService = {
  // Publica a oferta (só o dono do attendance; só SCHEDULED). Erros: 403 não-dono,
  // 422 QUEUE_SWAP_OFFER_NOT_ALLOWED (não SCHEDULED / fora da fila = fatia 2).
  create(data: CreateSwapOfferRequest, accessToken: string) {
    return api.post<SwapOfferResponse>('/swap-offers', data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  // Ofertas OPEN que EU posso aceitar (filtradas por posição/direção; exclui as
  // minhas). Alimenta o dot + a lista de aceitar. Vazio se não estou na fila dele.
  listAcceptable(professionalId: string, accessToken: string) {
    return api.get<SwapOfferResponse[]>('/swap-offers', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { professionalId },
    });
  },

  // Minhas ofertas OPEN (para cancelar).
  listMine(accessToken: string) {
    return api.get<SwapOfferResponse[]>('/swap-offers/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  // Aceita a oferta: troca 1-por-1 dos scheduledTime; notifica os dois lados por
  // WS (SWAP_OFFER_ACCEPTED) + push. Erros: 404, 422 (não OPEN / própria / não
  // elegível / caller fora da fila).
  accept(offerId: string, accessToken: string) {
    return api.patch<SwapOfferResponse>(`/swap-offers/${offerId}/accept`, null, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  // Solicitante cancela a própria oferta (OPEN → CANCELLED). 204.
  cancel(offerId: string, accessToken: string) {
    return api.delete<void>(`/swap-offers/${offerId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
