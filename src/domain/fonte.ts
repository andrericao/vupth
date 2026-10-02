// "Tamanho da letra" (Andre, 26/09): o cliente escolhe nas Configuracoes, um
// passo por vez — 10 → 11 → 12 → 13 → 14. Ate +4.
export const PASSOS_DA_FONTE = [0, 1, 2, 3, 4] as const;
export const MAIOR_PASSO = 4;

export function passoValido(valor: unknown): number {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 0 && n <= MAIOR_PASSO ? n : 0;
}

export function rotuloDoPasso(passo: number): string {
  return passo === 0 ? 'Normal' : `+${passo}`;
}

// Como o tamanho chega as telas do NativeWind: o tailwind.config.js le cada
// tamanho de uma VARIAVEL CSS (var(--text-xs), var(--f13)...) e o App as define
// com `vars(varsDaFonte(passo))`. Trocar o passo troca as variaveis — o
// NativeWind reaplica em todas as telas, sem mexer em nenhuma classe. A mesma
// escala e o mesmo nome do Partner (src/lib/fonte.ts), para os dois apps nao
// divergirem.

/** A escala do tailwind.config.js: [tamanho, altura de linha], em px. */
export const ESCALA_DE_TEXTO: Record<string, [number, number]> = {
  xs: [12, 16],
  sm: [14, 20],
  md: [16, 22],
  base: [16, 24],
  lg: [18, 24],
  xl: [22, 26],
  '2xl': [24, 32],
  xxl: [28, 32],
  '3xl': [30, 36],
  xxxl: [34, 38],
};

/** Tamanhos soltos (text-f13 e companhia). */
export const TAMANHOS_SOLTOS = [10, 11, 13, 14, 15, 22, 26, 30, 32] as const;

export function varsDaFonte(passo: number): Record<string, string> {
  const p = passoValido(passo);
  const v: Record<string, string> = {};
  for (const [nome, [tamanho, linha]] of Object.entries(ESCALA_DE_TEXTO)) {
    v[`--text-${nome}`] = `${tamanho + p}px`;
    v[`--lh-${nome}`] = `${linha + p}px`;
  }
  for (const t of TAMANHOS_SOLTOS) v[`--f${t}`] = `${t + p}px`;
  return v;
}
