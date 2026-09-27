// A versao do app para quem le (Andre, 26/09): o visitante nao ve o menu
// "Versão do app" — ve so a versao e a data, sem os 7 toques do diagnostico.

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** "Versão 1.0.2 · 26/09/2026" — sem a data quando o app roda o bundle embutido. */
export function rotuloDaVersao(versao: string | null | undefined, atualizadoEm?: Date | null): string {
  const partes = [`Versão ${versao || '—'}`];
  if (atualizadoEm && !Number.isNaN(atualizadoEm.getTime())) {
    partes.push(
      `${doisDigitos(atualizadoEm.getDate())}/${doisDigitos(atualizadoEm.getMonth() + 1)}/${atualizadoEm.getFullYear()}`,
    );
  }
  return partes.join(' · ');
}
