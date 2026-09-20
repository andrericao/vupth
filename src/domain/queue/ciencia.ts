import { CANCELLATION_PENALTY_VALUE } from './types';

/**
 * CIÊNCIA — "não podemos agir na surdina" (Andre, 18/09).
 *
 * O cliente nunca é multado, nem marcado como atrasado, sem ter tocado num
 * aviso. O toque É o registro de que ele soube: não serve tarja que passa, nem
 * texto escondido no histórico.
 *
 * A saída da fila já avisa assim (ver `avisoDeSaida`). O que faltava era o
 * ATRASO — e ele avisa MESMO QUANDO NÃO HÁ MULTA, porque a contagem é o que
 * torna a terceira vez justa: quem chega na 3ª sem nunca ter sido avisado é
 * punido por uma regra que não viu.
 */

export type AvisoDeAtraso = {
  titulo: string;
  mensagem: string;
  /** Um só, e obrigatório: é ele que registra a ciência. */
  botao: string;
};

const MULTA_NA_TERCEIRA = 3;

const ordinal = (n: number): string => `${n}º`;

export function avisoDeAtraso(s: {
  /** Quantos atrasos o cliente já tem, contando este. Vem do backend. */
  contagem?: number | null;
  /** Este atraso gera multa? Quando o backend não diz, deriva da contagem. */
  multa?: boolean;
  valor?: number;
}): AvisoDeAtraso {
  const valor = `R$ ${(s.valor ?? CANCELLATION_PENALTY_VALUE).toFixed(2).replace('.', ',')}`;
  const temContagem = typeof s.contagem === 'number' && s.contagem > 0;
  const multa = s.multa ?? (temContagem ? s.contagem! >= MULTA_NA_TERCEIRA : false);

  if (multa) {
    return {
      titulo: 'Você foi chamado e não chegou',
      mensagem: temContagem
        ? `Este é o seu ${ordinal(s.contagem!)} atraso, e desta vez há multa de ${valor} no seu ` +
          'próximo atendimento. Você continua na fila.'
        : `Você continua na fila, e há multa de ${valor} no seu próximo atendimento.`,
      botao: 'Entendi',
    };
  }

  if (temContagem) {
    const faltam = MULTA_NA_TERCEIRA - s.contagem!;
    return {
      titulo: 'Você foi chamado e não chegou',
      mensagem:
        `Este é o seu ${ordinal(s.contagem!)} atraso — sem multa. Você continua na fila. ` +
        `Na ${ordinal(MULTA_NA_TERCEIRA)} vez passa a haver multa de ${valor} ` +
        `(${faltam === 1 ? 'falta uma' : `faltam ${faltam}`}).`,
      botao: 'Entendi',
    };
  }

  // Sem a contagem do backend: avisa o que SABE, e não inventa ordinal.
  return {
    titulo: 'Você foi chamado e não chegou',
    mensagem:
      'Você continua na fila, e por enquanto sem multa. Chamadas sem chegar se acumulam — ' +
      `a partir da ${ordinal(MULTA_NA_TERCEIRA)} há multa de ${valor} no próximo atendimento.`,
    botao: 'Entendi',
  };
}

/**
 * Avisa este atraso agora? Só quando o atendimento ESTÁ atrasado e o cliente
 * ainda não tocou no aviso dele. Sem isto, o poll de 30s repetiria a caixa a
 * cada volta — e aviso que pisca sozinho deixa de ser aviso.
 */
export function precisaAvisarAtraso(s: {
  status?: string | null;
  attendanceId?: string | null;
  jaAvisados: string[];
}): boolean {
  if (s.status !== 'LATE' || !s.attendanceId) return false;
  return !s.jaAvisados.includes(s.attendanceId);
}
