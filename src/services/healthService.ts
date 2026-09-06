import { API_BASE_URL, API_ENV } from "./api";

// Portao de readiness para o cold start do Render Free (hiberna por inatividade;
// o 1o request apos hibernar acorda a instancia e demora ~50s). Cutuca o endpoint
// PUBLICO GET /actuator/health/readiness com retry+backoff ate 200 {"status":"UP"}.
// Ver CLAUDE.md "Readiness / cold start" e PRD_BACKEND secao 18c.

export interface WaitForBackendOptions {
  baseUrl?: string;
  /** Desliga o portao (a maquina nao hiberna, nao ha cold start). Default: env !== "dev". */
  enabled?: boolean;
  /** Teto total de espera. Default 90s. */
  maxTotalMs?: number;
  /** Timeout por tentativa. Default 60s. */
  perAttemptMs?: number;
  /** Backoff inicial entre tentativas. Default 1.5s. */
  initialBackoffMs?: number;
  /** Backoff maximo. Default 8s. */
  maxBackoffMs?: number;
  /** Permite abortar (ex.: usuario saiu da tela). */
  isCancelled?: () => boolean;
  /** Callback a cada tentativa (para feedback de UI). */
  onAttempt?: (attempt: number) => void;
}

async function pingReadiness(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/actuator/health/readiness`, {
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return data?.status === "UP";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Espera o backend ficar pronto (readiness UP). Retorna true se ficou pronto
 * dentro do teto, false se estourou o tempo ou foi cancelado. Nunca lanca.
 * A 1a cutucada acorda o Render; so depois do UP o fluxo real deve seguir.
 */
export async function waitForBackend(opts: WaitForBackendOptions = {}): Promise<boolean> {
  const {
    baseUrl = API_BASE_URL,
    enabled = API_ENV !== "dev",
    maxTotalMs = 90000,
    perAttemptMs = 60000,
    initialBackoffMs = 1500,
    maxBackoffMs = 8000,
    isCancelled,
    onAttempt,
  } = opts;

  if (!enabled) return true;

  const start = Date.now();
  let attempt = 0;
  let backoff = initialBackoffMs;

  while (Date.now() - start < maxTotalMs) {
    if (isCancelled?.()) return false;
    attempt += 1;
    onAttempt?.(attempt);

    if (await pingReadiness(baseUrl, perAttemptMs)) return true;
    if (isCancelled?.()) return false;

    await delay(backoff);
    backoff = Math.min(Math.round(backoff * 1.5), maxBackoffMs);
  }

  return false;
}
