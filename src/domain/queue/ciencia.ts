import { formatarReais } from '@utils/formatarReais';
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
   * Oferece "Adiar minha vez" no mesmo aviso (Andre, 26/09 — esboço): adiar
   * evita o próximo atraso. Não no 3º: ali ele já foi para o fim da fila.
   */
  oferecerAdiar: boolean;
};

// Regra dos 3 atrasos (Backend e328629, refeita pelo Andre em 26/09): no 1º e
// no 2º o cliente troca de lugar com o próximo e segue na fila; no 3º nasce a
// multa de R$ 5,00 e ele SAI da fila (Backend a454b4b, 24/10: o atendimento vira REMOVED). O
// contador fica em 3 até a multa ser paga; pago, volta a 0.
const MULTA_NA_TERCEIRA = 3;
export const MULTA_POR_ATRASO = 5;

const ordinal = (n: number): string => `${n}º`;
// Tom positivo antes da multa (Andre, 26/09: "não se atrase / evite multa").
const TITULO_POSITIVO = 'Você trocou de lugar';
const reais = formatarReais;

/** DEC-101: o prazo para chegar depois de chamado (texto do app). */
const TOLERANCIA_DO_ATRASO_MIN = 5;

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
  // textos-curtos (guia 4.3): 1o e 2o atraso "Você trocou de lugar"; o 3o, "3º atraso".
  const titulo = multa ? `${ordinal(MULTA_NA_TERCEIRA)} atraso` : TITULO_POSITIVO;
  const prazo = `Esteja na loja em até ${TOLERANCIA_DO_ATRASO_MIN} minutos.`;

  if (multa) {
    return {
      titulo,
      // aviso-de-atraso-e-saida-da-fila (24/10, Backend a454b4b): o 3º atraso tira o cliente da fila.
      mensagem: `Multa de ${valor} e você saiu da fila. Pague a multa para zerar a contagem.`,
      botao: 'Entendi',
      oferecerAdiar: false,
    };
  }

  if (temContagem) {
    return {
      titulo,
      mensagem: `${prazo} Este é o seu ${ordinal(s.contagem!)} atraso (${s.contagem} de ${MULTA_NA_TERCEIRA}). No ${ordinal(MULTA_NA_TERCEIRA)}, multa de ${valor} e você sai da fila.`,
      botao: 'Entendi',
      oferecerAdiar: true,
    };
  }

  // Sem a contagem do servidor: avisa o que SABE, e não inventa ordinal.
  return {
    titulo,
    mensagem: `${prazo} Sem multa por enquanto. No ${ordinal(MULTA_NA_TERCEIRA)} atraso, multa de ${valor} e você sai da fila.`,
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
