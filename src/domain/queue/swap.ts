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
