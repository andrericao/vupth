/**
 * Avaliação FICTÍCIA e estável (mesma loja → mesma nota) derivada do id.
 * Placeholder até existir avaliação real no backend. Retorna 4.0–5.0.
 */
export function pseudoRating(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return 4 + (h % 11) / 10;
}

export interface RatingDisplay {
  value: number;
  count?: number;
  /** true = nota real do backend; false = placeholder fictício (pseudoRating). */
  real: boolean;
}

/**
 * Resolve a nota a exibir: usa a média REAL do backend quando presente; senão
 * cai no placeholder fictício estável por id (até o Item 6 do backend existir).
 */
export function resolveRating(
  average: number | null | undefined,
  count: number | undefined,
  seed: string,
): RatingDisplay {
  if (average != null) {
    return { value: average, count, real: true };
  }
  return { value: pseudoRating(seed), real: false };
}
