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
