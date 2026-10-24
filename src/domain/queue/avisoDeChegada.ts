import { formatClockTime } from './types';

// aviso-de-chegada-na-entrada (André, 22/10): ao tocar em "Entrar na fila" (ou ao
// agendar para daqui a menos de 1 hora), um aviso só diz até que horas estar na
// loja: o horário em que a vez chega, menos 5 minutos de folga. Confirmar segue;
// Cancelar não entra. Com 1 hora ou mais de espera, não há aviso.

/** Abaixo disto (min) o aviso aparece. */
export const LIMITE_DO_AVISO_MINUTOS = 60;
/** A folga que o cliente ganha antes da vez (min). */
export const FOLGA_DA_CHEGADA_MINUTOS = 5;

export type AvisoDeChegada = { titulo: string; mensagem: string; confirmar: string; cancelar: string };

/**
 * `minutos` = quanto falta para a vez (espera estimada, ou o tempo até o
 * horário agendado). Sem estimativa, ou 1 hora ou mais: nada a avisar.
 */
export function avisoDeChegada(
  minutos: number | null | undefined,
  agoraMs: number,
  opcoes: { filaLivre?: boolean } = {},
): AvisoDeChegada | null {
  if (minutos == null || !Number.isFinite(minutos) || minutos >= LIMITE_DO_AVISO_MINUTOS) return null;
  // modal-sem-fila-5-minutos (André, 24/10): fila livre, só "em 5 minutos" (simbólico, urgência
  // sem regra nova). Do 2º da fila em diante vale o horário.
  if (opcoes.filaLivre) {
    return {
      titulo: 'Esteja na loja',
      mensagem: `Esteja na loja em ${FOLGA_DA_CHEGADA_MINUTOS} minutos.`,
      confirmar: 'Confirmar',
      cancelar: 'Cancelar',
    };
  }
  const falta = Math.max(0, minutos);
  const ate = new Date(agoraMs + Math.max(0, falta - FOLGA_DA_CHEGADA_MINUTOS) * 60000);
  return {
    titulo: 'Esteja na loja',
    mensagem: `Esteja na loja às ${formatClockTime(ate)}.`,
    confirmar: 'Confirmar',
    cancelar: 'Cancelar',
  };
}
