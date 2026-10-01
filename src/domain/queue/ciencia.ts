/**
 * CIÊNCIA — "não podemos agir na surdina" (Andre, 18/09).
 *
 * O cliente nunca é multado, nem marcado como atrasado, sem ter tocado num
 * aviso. O toque É o registro de que ele soube: não serve tarja que passa, nem
 * texto escondido no histórico.
 *
 * A saída da fila já avisa assim (ver `saidaDaFila`). O que faltava era o
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

// Regra dos 3 atrasos (Backend e328629, refeita pelo Andre em 26/09): no 1º e
// no 2º o cliente troca de lugar com o próximo e segue na fila; no 3º nasce a
// multa de R$ 5,00 (cobrada no próximo atendimento), ele vai para o FIM da fila
// — pode ficar ou sair sem nova multa — e o contador zera.
const MULTA_NA_TERCEIRA = 3;
export const MULTA_POR_ATRASO = 5;

const ordinal = (n: number): string => `${n}º`;
const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export function avisoDeAtraso(s: {
  /** Quantos atrasos o cliente já tem, contando este (`lateCount` do wait-time). */
  contagem?: number | null;
  /** Este atraso gera multa? Quando não se sabe, deriva da contagem. */
  multa?: boolean;
  valor?: number;
}): AvisoDeAtraso {
  const valor = reais(s.valor ?? MULTA_POR_ATRASO);
  const temContagem = typeof s.contagem === 'number' && s.contagem > 0;
  const multa = s.multa ?? (temContagem ? s.contagem! >= MULTA_NA_TERCEIRA : false);
  const titulo = 'Você foi chamado e não chegou';

  if (multa) {
    return {
      titulo,
      mensagem:
        (temContagem ? `Este é o seu ${ordinal(s.contagem!)} atraso: ` : '') +
        `multa de ${valor} no seu próximo atendimento, e você foi para o fim da fila. ` +
        'Pode continuar nela ou sair sem nova multa.',
      botao: 'Entendi',
    };
  }

  if (temContagem) {
    const faltam = MULTA_NA_TERCEIRA - s.contagem!;
    return {
      titulo,
      mensagem:
        `Este é o seu ${ordinal(s.contagem!)} atraso — sem multa. Você trocou de lugar com o próximo e continua na fila. ` +
        `No ${ordinal(MULTA_NA_TERCEIRA)}, multa de ${valor} e você vai para o fim da fila` +
        (faltam > 0 ? ` (${faltam === 1 ? 'falta um' : `faltam ${faltam}`}).` : '.'),
      botao: 'Entendi',
    };
  }

  // Sem a contagem do servidor: avisa o que SABE, e não inventa ordinal.
  return {
    titulo,
    mensagem:
      'Você trocou de lugar com o próximo e continua na fila, por enquanto sem multa. Os atrasos se acumulam — ' +
      `no ${ordinal(MULTA_NA_TERCEIRA)}, multa de ${valor} e você vai para o fim da fila.`,
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
