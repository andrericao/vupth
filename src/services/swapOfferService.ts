import { api } from './api';

// Oferta ABERTA de troca de posição (Client C13). Backend completo: fatia 1
// (solicitante NA fila, 2026-07-24) + fatia 2 (solicitante FORA da fila,
// 2026-07-27). Adiantar = EARLIER (aparece p/ quem está à frente); Atrasar =
// LATER (aparece p/ quem está atrás). Nunca gera multa; expira quando o
// solicitante é atendido/cancela.
export type SwapOfferDirection = 'EARLIER' | 'LATER';
export type SwapOfferStatus = 'OPEN' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';

// Fatia 1 — quem JÁ está na fila oferta a própria vez (as duas direções).
export interface InQueueSwapOfferRequest {
  attendanceId: string;
  direction: SwapOfferDirection;
}

// Fatia 2 — quem está FORA da fila publica para entrar por troca. Posição
// implícita = FIM, por isso só EARLIER. Os serviços vêm já na publicação: o
// atendimento só nasce no aceite, e a fila precisa da duração para recalcular
// os ETAs. Quem aceita cede a vaga e vai pro fim.
export interface OutOfQueueSwapOfferRequest {
  professionalId: string;
  serviceItemIds: string[];
  direction: 'EARLIER';
}

export type CreateSwapOfferRequest = InQueueSwapOfferRequest | OutOfQueueSwapOfferRequest;

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
  // Publica a oferta. NA fila: só o dono do attendance, só SCHEDULED (403
  // não-dono, 422 QUEUE_SWAP_OFFER_NOT_ALLOWED se não SCHEDULED). FORA da fila:
  // 422 QUEUE_SWAP_OFFER_NOT_ALLOWED (LATER / já estar na fila daquele
  // profissional), 404 SERVICE_ITEM_NOT_FOUND, 422 SERVICE_ITEM_NOT_OF_PROFESSIONAL.
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
  // 409 SWAP_NEEDS_CONFIRMATION: a espera cai a menos de 1 hora — o app mostra
  // o aviso e manda de novo com `confirmarMenosDeUmaHora` (Backend 43efd61).
  accept(offerId: string, accessToken: string, confirmarMenosDeUmaHora = false) {
    return api.patch<SwapOfferResponse>(`/swap-offers/${offerId}/accept`, null, {
      headers: { Authorization: `Bearer ${accessToken}` },
      ...(confirmarMenosDeUmaHora ? { params: { confirmLessThanHour: true } } : {}),
    });
  },

  // Pedido de troca direto (SWAP_REQUESTED, Backend 43efd61): aceitar pela
  // notificacao. Mesmo 409 SWAP_NEEDS_CONFIRMATION da oferta.
  acceptRequest(swapRequestId: string, accessToken: string, confirmarMenosDeUmaHora = false) {
    return api.patch<void>(`/swap-requests/${swapRequestId}`, null, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { accept: true, ...(confirmarMenosDeUmaHora ? { confirmLessThanHour: true } : {}) },
    });
  },

  // Recusar o pedido de troca pelo push (push-acoes-por-pergunta): o mesmo PATCH com accept=false.
  refuseRequest(swapRequestId: string, accessToken: string) {
    return api.patch<void>(`/swap-requests/${swapRequestId}`, null, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { accept: false },
    });
  },

  // Solicitante cancela a própria oferta (OPEN → CANCELLED). 204.
  cancel(offerId: string, accessToken: string) {
    return api.delete<void>(`/swap-offers/${offerId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
