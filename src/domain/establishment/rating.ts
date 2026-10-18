export interface RatingDisplay {
  /** A media real; 0 quando ainda nao ha avaliacao (so serve para ordenar/filtrar). */
  value: number;
  count?: number;
  /** true = nota real do backend. */
  real: boolean;
  /** Sem avaliacao ainda: a tela mostra "Novo", nunca uma nota inventada. */
  novo: boolean;
}

/**
 * A nota a exibir (nota-novo, Andre 09/10): a media REAL do backend quando ha
 * avaliacao; sem ela (media nula ou zero avaliacoes), a loja e "Novo". Antes
 * entrava aqui uma nota de exemplo derivada do id — uma loja sem nenhuma
 * avaliacao aparecia com 4,7 estrelas.
 */
export function resolveRating(average: number | null | undefined, count: number | undefined): RatingDisplay {
  if (average == null || count === 0) {
    return { value: 0, real: false, novo: true };
  }
  return { value: average, count, real: true, novo: false };
}
