// Autenticacao do socket STOMP — logica PURA (o wiring vive em
// services/stompCompartilhado). Espelho do `src/lib/socketAuth.ts` do Partner.
//
// C16: o access token dura 1h. O `beforeConnect` ja lia o token guardado a
// cada tentativa, mas sem conferir se ele tinha vencido — e o servidor aceita
// token vencido como sessao ANONIMA: o canal pessoal fica mudo, sem erro. Com
// a recusa do CONNECT ligada no Backend (recusar-connect-invalido), sem renovar
// o app entraria em loop de ERROR e perderia ate a fila publica.

/** Margem: renova ANTES de expirar, para o token nao morrer no meio da sessao. */
export const MARGEM_DE_RENOVACAO_MS = 2 * 60 * 1000;

/** `exp` (s) do JWT, ou null se o token for ilegivel. */
export function expiracaoDoToken(token: string): number | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const exp = JSON.parse(json)?.exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

/**
 * O token precisa ser renovado antes de abrir/reabrir o socket? `true` quando
 * e ilegivel ou vence dentro da margem. Sem token (visitante) nao ha o que
 * renovar: conecta anonimo, como sempre.
 */
export function precisaRenovar(
  token: string | null | undefined,
  agoraMs: number = Date.now(),
  margemMs: number = MARGEM_DE_RENOVACAO_MS,
): boolean {
  if (!token) return false;
  const exp = expiracaoDoToken(token);
  if (exp == null) return true;
  return exp * 1000 - agoraMs <= margemMs;
}

/**
 * O servidor recusou o CONNECT por token invalido (frame ERROR com
 * `message: INVALID_TOKEN`)? Entao a proxima tentativa renova mesmo que o
 * `exp` ainda nao tenha chegado (ex.: token revogado) — sem isso o
 * `reconnectDelay` reenviaria o mesmo token para sempre.
 */
export function tokenRecusado(mensagem: string | null | undefined): boolean {
  return !!mensagem && mensagem.includes("INVALID_TOKEN");
}
