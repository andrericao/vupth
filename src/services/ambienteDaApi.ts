import { API_BASE_URL, API_ENV } from "./api";
import type { ApiEnv } from "./apiEnv";

// checar-ambiente-da-api (F20, DEC-181/184): a trava do canal (apiEnv.ts) garante o ENDERECO certo no bundle;
// esta confere, no portao de readiness, o que a API DIZ ser. O Backend publica em GET /actuator/info (publico)
// `env: production | staging | local`. Build de producao falando com uma API que diz `staging` (ou o inverso)
// nao segue: o app para numa tela propria, sem faixa visivel nas outras telas (tirar-faixa-de-ambiente).
//
// So recusa com a resposta em maos. Sem resposta, sem o campo ou com valor fora da lista, segue: a trava existe
// para pegar o endereco trocado, nao para derrubar o app num tropeco de rede.

export type ConferenciaDoAmbiente = "ok" | "errado";

/** O que a API diz ser, contra o que este build espera. So os pares trocados recusam. */
export function ambienteBate(apiEnv: ApiEnv, envDaApi: unknown): boolean {
  if (apiEnv === "prod") return envDaApi !== "staging";
  if (apiEnv === "staging") return envDaApi !== "production";
  return true;
}

export interface ConferirOpcoes {
  baseUrl?: string;
  apiEnv?: ApiEnv;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

/** Nunca lanca. `errado` so quando a API respondeu um ambiente que nao e o deste build. */
export async function conferirAmbienteDaApi(opts: ConferirOpcoes = {}): Promise<ConferenciaDoAmbiente> {
  const { baseUrl = API_BASE_URL, apiEnv = API_ENV, timeoutMs = 10000, fetchFn = fetch } = opts;
  // A maquina (dev) nao tem o que conferir: e o Docker de quem programa.
  if (apiEnv === "dev") return "ok";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(`${baseUrl}/actuator/info`, { signal: controller.signal });
    if (!res.ok) return "ok";
    const data = await res.json().catch(() => null);
    return ambienteBate(apiEnv, data?.env) ? "ok" : "errado";
  } catch {
    return "ok";
  } finally {
    clearTimeout(timer);
  }
}
