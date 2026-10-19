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
  /**
   * Oferece "Adiar" no mesmo aviso (Andre, 26/09 — esboço): adiar evita o
   * próximo atraso. Não no 3º: ali ele já foi para o fim da fila.
   */
  oferecerAdiar: boolean;
};

// Regra dos 3 atrasos (Backend e328629, refeita pelo Andre em 26/09): no 1º e
// no 2º o cliente troca de lugar com o próximo e segue na fila; no 3º nasce a
// multa de R$ 5,00 (cobrada no próximo atendimento), ele vai para o FIM da fila
// — pode ficar ou sair sem nova multa — e o contador zera.
const MULTA_NA_TERCEIRA = 3;
export const MULTA_POR_ATRASO = 5;

const ordinal = (n: number): string => `${n}º`;
// O título diz o FATO (guia de texto, §4.3): a troca de lugar já aconteceu. O
// tom de "evite a multa" (Andre, 26/09) passou para o corpo: "No 3º, R$ 5,00".
const TITULO_DA_TROCA = 'Você trocou de lugar';
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
  if (multa) {
    return {
      // No 3º por regra; com a contagem do servidor, o ordinal dele.
      titulo: `${ordinal(temContagem ? s.contagem! : MULTA_NA_TERCEIRA)} atraso`,
      mensagem: `Multa de ${valor} e você foi para o fim da fila.`,
      botao: 'Entendi',
      oferecerAdiar: false,
    };
  }

  if (temContagem) {
    return {
      titulo: TITULO_DA_TROCA,
      mensagem: `${ordinal(s.contagem!)} atraso, sem multa. No ${ordinal(MULTA_NA_TERCEIRA)}, ${valor} e fim da fila.`,
      botao: 'Entendi',
      oferecerAdiar: true,
    };
  }

  // Sem a contagem do servidor: avisa o que SABE, e não inventa ordinal.
  return {
    titulo: TITULO_DA_TROCA,
    mensagem: `Sem multa por enquanto. No ${ordinal(MULTA_NA_TERCEIRA)} atraso, ${valor} e fim da fila.`,
    botao: 'Entendi',
    oferecerAdiar: true,
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
