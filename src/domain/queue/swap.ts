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

/** Rótulo do PRÓPRIO pedido publicado (lista "meus pedidos"). */
export function myOfferText(direction: SwapOfferDirection): string {
  return direction === 'EARLIER' ? 'Pedido para adiantar' : 'Pedido para atrasar';
}
