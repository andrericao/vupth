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
