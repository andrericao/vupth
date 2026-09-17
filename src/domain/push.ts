// Notificações push (Expo) — LÓGICA PURA, sem importar módulos nativos
// (expo-notifications/expo-device). O wiring nativo vive em
// src/hooks/usePushRegistration (a criar quando houver `eas build` com o módulo).
// Contrato do backend (PRD_BACKEND "Notificações push"): POST /devices {token,
// platform}, DELETE /devices/{token} (token url-encodado por causa dos colchetes).

export type DevicePlatform = 'ios' | 'android' | 'web';

export function mapPlatform(os: string): DevicePlatform {
  if (os === 'ios' || os === 'android' || os === 'web') return os;
  return 'android';
}

// O token Expo vem como "ExponentPushToken[...]". Os colchetes crus no path são
// rejeitados pelo Tomcat (400); por isso encodamos o segmento no DELETE.
export function deviceDeletePath(token: string): string {
  return `/devices/${encodeURIComponent(token)}`;
}

// Roteia o toque na notificação pelo `data.type` que o backend manda no push.
// No app-cliente os tipos conhecidos levam para a aba Atendimentos (fila ao vivo +
// agendamentos); tipo desconhecido/ausente => null (não navega).
export function notificationRoute(data: unknown): string | null {
  const type = (data as { type?: unknown } | null | undefined)?.type;
  if (typeof type !== 'string') return null;
  const known =
    type === 'ATTENDANCE_STARTED' ||
    type === 'ATTENDANCE_FINISHED' ||
    type === 'ATTENDANCE_PROMOTED' ||
    type === 'ATTENDANCE_CANCELLED' ||
    type === 'QUEUE_NEXT_IN_LINE' ||
    type.startsWith('CUT_');
  return known ? 'attendances' : null;
}

// Dependências nativas injetadas (expo-notifications/expo-device) — mantém a
// máquina de permissão 100% testável sem tocar em módulo nativo.
export type PushEnv = {
  isDevice: boolean;
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: (opts: { projectId?: string }) => Promise<{ data: string }>;
  projectId?: string;
};

/**
 * Por que a aquisição termina — e por que isto não pode ser só `null`.
 *
 * Até 2026-09-07 esta função devolvia `null` para TRÊS desfechos diferentes
 * (emulador, permissão negada, token vazio) e o chamador engolia o resto num
 * `catch {}`. O relato "não recebi nenhuma notificação, de input nenhum" era
 * então indistinguível de "nem tentamos": não havia como saber onde parou.
 */
export type MotivoPush =
  | 'ok'
  | 'emulador'
  | 'sem-permissao'
  | 'sem-token'
  | 'sem-project-id'
  | 'erro';

export type ResultadoPush = {
  token: string | null;
  motivo: MotivoPush;
  /** Mensagem crua quando `motivo` é 'erro' — o único rastro que sobra. */
  detalhe?: string;
};

// Pede permissão (se preciso) e devolve o Expo Push Token com o MOTIVO do
// desfecho. Best-effort: nunca lança — quem chama não pode quebrar por push.
export async function acquireExpoPushToken(env: PushEnv): Promise<ResultadoPush> {
  // Emulador/web não recebem push remoto — nem pede permissão.
  if (!env.isDevice) return { token: null, motivo: 'emulador' };

  try {
    let { status } = await env.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await env.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return { token: null, motivo: 'sem-permissao' };

    // Sem `projectId` o Expo não sabe para qual projeto emitir o token. Vale
    // nomear: o sintoma (nenhum push) é igual ao de permissão negada.
    if (!env.projectId) return { token: null, motivo: 'sem-project-id' };

    const { data } = await env.getExpoPushTokenAsync({ projectId: env.projectId });
    if (!data) return { token: null, motivo: 'sem-token' };
    return { token: data, motivo: 'ok' };
  } catch (e) {
    // Onde cai a credencial de push ausente (FCM não configurado no projeto):
    // a chamada nativa lança, e antes disto o erro morria no `catch {}` de quem
    // chamava.
    return { token: null, motivo: 'erro', detalhe: (e as Error)?.message ?? String(e) };
  }
}

/**
 * Esperas entre as tentativas do POST /devices. Somam ~66s, acima dos ~50s que
 * o Render Free leva para acordar — a primeira chamada é a que o acorda.
 */
export const ESPERAS_REGISTRO_MS = [3_000, 6_000, 12_000, 20_000, 25_000];

/**
 * Vale tentar de novo? Só quando o servidor NÃO respondeu (erro de rede,
 * timeout) ou respondeu 5xx — o Render acordando devolve as duas coisas. Um 4xx
 * é o backend recusando de verdade: repetir daria a mesma resposta.
 */
export function erroTransitorio(e: unknown): boolean {
  const status = (e as { response?: { status?: number } })?.response?.status;
  if (status === undefined) return true;
  return status >= 500;
}

export type RegistroEnv = {
  enviar: () => Promise<unknown>;
  esperar: (ms: number) => Promise<void>;
  cancelado: () => boolean;
  /** Chamado antes de cada nova tentativa (a partir da 2ª), para o painel. */
  aoTentarDeNovo?: (tentativa: number, erro: unknown) => void;
  esperas?: number[];
};

/**
 * POST /devices com novas tentativas para o cold start.
 *
 * Até 16/09 era uma chamada só, logo depois do login. Com o backend hibernando
 * ela caía por rede, e o aparelho ficava SEM PUSH até a pessoa sair e entrar de
 * novo — sem nada na tela que dissesse isso. O teste de 15/09 mostrou "backend
 * sabe? NÃO — network error" num aparelho e "sim" no outro.
 *
 * Devolve 'ok', 'cancelado' ou lança o último erro.
 */
export async function registrarComRetentativa(env: RegistroEnv): Promise<'ok' | 'cancelado'> {
  const esperas = env.esperas ?? ESPERAS_REGISTRO_MS;
  for (let i = 0; ; i++) {
    try {
      await env.enviar();
      return 'ok';
    } catch (e) {
      if (!erroTransitorio(e) || i >= esperas.length) throw e;
      if (env.cancelado()) return 'cancelado';
      env.aoTentarDeNovo?.(i + 2, e);
      await env.esperar(esperas[i]);
      if (env.cancelado()) return 'cancelado';
    }
  }
}
