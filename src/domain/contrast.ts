/**
 * Contraste WCAG entre duas cores. Existe porque o app ja regrediu tres vezes
 * no mesmo lugar — texto que some — e nenhum teste pegava:
 *
 *  · `$gray400` (#B9BBBC) em 8 pontos: 1,93:1
 *  · `$gray500` (#DDDEDF) como cor de mensagem de erro: 1,35:1
 *  · forest a 60% sobre o verde da fila: 3,39:1
 *
 * Os tres passaram por revisao humana sem ninguem notar, porque contraste nao
 * se ve — se calcula. Fonte: WCAG 2.1, 1.4.3 (minimo 4,5:1 pra texto normal,
 * 3:1 pra texto grande e pra elemento grafico que carrega informacao).
 */

/** Aceita `#RRGGBB` e `#RRGGBBAA`. */
function canais(hex: string): { rgb: number[]; alpha: number } {
  const h = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const alpha = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { rgb, alpha };
}

function luminancia(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Razao de contraste da COR JA COMPOSTA sobre o fundo. O alpha importa: e
 * exatamente por ignora-lo que um `#16330099` parece forest e mede 3,39:1.
 */
export function contraste(frente: string, fundo: string): number {
  const f = canais(frente);
  const b = canais(fundo);
  const composta = f.rgb.map((v, i) => v * f.alpha + b.rgb[i] * (1 - f.alpha));
  const [claro, escuro] = [luminancia(composta), luminancia(b.rgb)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Texto normal precisa de 4,5:1 (WCAG 1.4.3 AA). */
export function passaEmTexto(frente: string, fundo: string): boolean {
  return contraste(frente, fundo) >= 4.5;
}
