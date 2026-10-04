import { SwapOfferDirection } from '@services/swapOfferService';

// Textos da troca (C13) do ponto de vista certo. Sem nome do solicitante (o
// backend não expõe) — a DIREÇÃO diz o que acontece se eu aceitar.

/**
 * Texto para QUEM VAI ACEITAR a oferta.
 * - `EARLIER`: o solicitante quer adiantar (está atrás) → aceitar = eu vou pra trás.
 * - `LATER`: o solicitante quer atrasar (está à frente) → aceitar = eu subo.
 */
export function acceptOfferText(direction: SwapOfferDirection): string {
  return direction === 'EARLIER'
    ? 'Alguém quer passar na sua frente — aceitar e ir para o lugar dele?'
    : 'Alguém quer te deixar passar — aceitar e subir na fila?';
}

/**
 * Rótulo do PRÓPRIO pedido publicado (lista "meus pedidos"). `outOfQueue` = a
 * oferta da fatia 2 (publicada de fora da fila): não é "adiantar", é ENTRAR.
 */
export function myOfferText(direction: SwapOfferDirection, outOfQueue = false): string {
  if (outOfQueue) return 'Pedido para entrar por troca';
  return direction === 'EARLIER' ? 'Pedido para adiantar' : 'Pedido para atrasar';
}

/** Oferta publicada de FORA da fila (fatia 2): não tem atendimento de origem. */
export function isOutOfQueueOffer(offer: { requesterAttendanceId: string | null }): boolean {
  return offer.requesterAttendanceId === null;
}

/**
 * Pedidos meus que SUMIRAM do `GET /swap-offers/me` (que só lista OPEN): foram
 * aceitos, cancelados ou expiraram. Quem sumiu por ACEITE é distinguido depois,
 * procurando o atendimento que nasceu na vaga cedida (`findSwapAttendance`).
 */
export function vanishedPendingOffers<T extends { offerId: string }>(
  pending: T[],
  openOffers: { id: string }[],
): T[] {
  const openIds = openOffers.map((o) => o.id);
  return pending.filter((p) => !openIds.includes(p.offerId));
}

/**
 * O atendimento que nasceu do aceite: ativo (aguardando) com aquele
 * profissional. O solicitante não passou pelo app para criá-lo — o backend o
 * cria na vaga cedida —, então ele só aparece no histórico do cliente.
 */
export function findSwapAttendance<A extends { professionalId: string; status: string }>(
  attendances: A[],
  professionalId: string,
): A | undefined {
  return attendances.find(
    (a) =>
      a.professionalId === professionalId && (a.status === 'SCHEDULED' || a.status === 'LATE'),
  );
}

/**
 * Mensagem de erro ao publicar a oferta de FORA da fila (fatia 2). Os códigos
 * vêm do backend (seção `/swap-offers`); `QUEUE_SWAP_OFFER_NOT_ALLOWED` aqui só
 * pode significar "já estou na fila desse profissional" (a UI nunca manda LATER
 * de fora, e o profissional sem estabelecimento não aparece na Home).
 */
export function outOfQueueOfferErrorMessage(code?: string, status?: number): string {
  switch (code) {
    case 'QUEUE_SWAP_OFFER_NOT_ALLOWED':
      return 'Você já está na fila desse profissional — use "Mudar minha vez" para pedir a troca por lá.';
    case 'SERVICE_ITEM_NOT_OF_PROFESSIONAL':
      return 'Um dos serviços escolhidos não é deste profissional. Selecione de novo.';
    case 'SERVICE_ITEM_NOT_FOUND':
      return 'Serviço não encontrado. Atualize a tela e tente de novo.';
    case 'PROFESSIONAL_NOT_FOUND':
      return 'Profissional não encontrado. Volte e escolha outro.';
    default:
      return status === 401
        ? 'Entre na sua conta para pedir a troca.'
        : 'Não foi possível publicar o pedido. Tente novamente em instantes.';
  }
}

/**
 * Mensagem de erro ao ACEITAR uma oferta de troca (o modal das ofertas e o
 * convite). D14 (Backend a69d4e5): a troca so acontece entre atendimentos com
 * ate 10 min de diferenca de duracao — 422 QUEUE_SWAP_DURATION_INCOMPATIBLE; a
 * fila nao muda e a oferta segue aberta para outro.
 */
export function acceptOfferErrorMessage(code?: string): string {
  switch (code) {
    case 'QUEUE_SWAP_DURATION_INCOMPATIBLE':
      return 'A troca só vale entre serviços de duração parecida — a sua vez continua a mesma.';
    case 'QUEUE_SWAP_OFFER_NOT_FOUND':
      return 'Essa oferta não está mais disponível.';
    default:
      return 'A oferta pode ter sido aceita por outra pessoa ou expirado.';
  }
}

/**
 * Onde fica a vaga de um atendimento na fila, e por volta de que horas ela e
 * chamada (Andre, 26/09: "como o cliente decidiria se iria trocar sem saber em
 * que horario?"). Aceitar uma troca e ficar com a vaga de quem pediu — e ela
 * que o pedido mostra.
 *
 * A conta usa so a fila que o servidor devolve: quem espera (SCHEDULED/LATE),
 * na ordem dela, cada um com o proprio tempo; o que falta do atendimento em
 * curso e o total restante menos o de quem espera. `null` quando a vaga nao
 * esta entre os que esperam (o pedido e de fora da fila, ou ela andou).
 */
export function vagaNaFila(
  fila: {
    attendancesInQueue: { id: string; status: string; estimatedMinutes: number | null }[];
    totalRemainingMinutes: number;
  },
  attendanceId: string | null,
  agoraMs: number,
): { posicao: number; horarioMs: number } | null {
  if (!attendanceId) return null;
  const esperando = fila.attendancesInQueue.filter((a) => a.status === 'SCHEDULED' || a.status === 'LATE');
  const i = esperando.findIndex((a) => a.id === attendanceId);
  if (i < 0) return null;
  const minutos = (a: { estimatedMinutes: number | null }) => Math.max(0, a.estimatedMinutes ?? 0);
  const deQuemEspera = esperando.reduce((t, a) => t + minutos(a), 0);
  const emCurso = Math.max(0, (fila.totalRemainingMinutes ?? 0) - deQuemEspera);
  const antes = esperando.slice(0, i).reduce((t, a) => t + minutos(a), 0);
  return { posicao: i + 1, horarioMs: agoraMs + (emCurso + antes) * 60000 };
}
