import { SUPORTE_URL } from '@utils/suporte';

// pedido-de-feedback (CLI-34, Andre 17/10): depois do atendimento, uma caixa
// pede feedback sobre o app e leva ao formulario do Suporte.

const DIA_MS = 24 * 60 * 60 * 1000;
/** No maximo uma vez a cada 30 dias. */
export const INTERVALO_DO_PEDIDO_MS = 30 * DIA_MS;
/** Quem tocou em "Enviar feedback" so e chamado de novo 90 dias depois. */
export const INTERVALO_APOS_ENVIO_MS = 90 * DIA_MS;

/** O formulario do Suporte, com o perfil e a categoria ja escolhidos. */
export const FEEDBACK_URL = `${SUPORTE_URL}contato.html?perfil=cliente&categoria=feedback`;

/** `null` = nunca aconteceu. Datas em ms desde 1970. */
export function devePedirFeedback(agora: number, ultimoPedido: number | null, ultimoEnvio: number | null): boolean {
  if (ultimoEnvio !== null && agora - ultimoEnvio < INTERVALO_APOS_ENVIO_MS) return false;
  if (ultimoPedido !== null && agora - ultimoPedido < INTERVALO_DO_PEDIDO_MS) return false;
  return true;
}
