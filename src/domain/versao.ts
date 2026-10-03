// A versao do app para quem le (Andre, 26/09): o visitante nao ve o menu
// "Versão do app" — ve so a versao e a data, sem os 7 toques do diagnostico.

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/**
 * "Versão 1.0.2 · 26/09/2026 · c65338e7" — sem a data quando o app roda o
 * bundle embutido; sem o commit quando o bundle nao foi carimbado (modo dev).
 */
export function rotuloDaVersao(
  versao: string | null | undefined,
  atualizadoEm?: Date | null,
  commit?: string | null,
): string {
  const partes = [`Versão ${versao || '—'}`];
  if (atualizadoEm && !Number.isNaN(atualizadoEm.getTime())) {
    partes.push(
      `${doisDigitos(atualizadoEm.getDate())}/${doisDigitos(atualizadoEm.getMonth() + 1)}/${atualizadoEm.getFullYear()}`,
    );
  }
  if (commit) partes.push(commit);
  return partes.join(' · ');
}

// O commit do bundle que esta rodando (Andre, 03/10 — a bateria confere a
// versao antes de comecar). O app.config.js carimba `extra.commit` no build e
// no OTA; no OTA o `Constants.expoConfig` e o do update, entao o commit e o do
// JS que roda, nao o do APK.
const COMMIT = /^[0-9a-f]{7,40}$/i;

/** Os 8 primeiros caracteres do `extra.commit`, ou null se nao houver um commit valido. */
export function commitDoApp(extra: unknown): string | null {
  const bruto = (extra as { commit?: unknown } | null | undefined)?.commit;
  if (typeof bruto !== 'string' || !COMMIT.test(bruto.trim())) return null;
  return bruto.trim().slice(0, 8).toLowerCase();
}
