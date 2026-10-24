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
// "É quase a sua vez!" (QUEUE_NEXT_IN_LINE) leva à própria fila (Andre, 05/10:
// o toque abria a Home); os outros tipos conhecidos, à aba Atendimentos (fila
// ao vivo + agendamentos); tipo desconhecido/ausente => null (não navega).
export type RotaDaNotificacao = 'fila' | 'attendances';

export function notificationRoute(data: unknown): RotaDaNotificacao | null {
  const type = (data as { type?: unknown } | null | undefined)?.type;
  if (typeof type !== 'string') return null;
  if (type === 'QUEUE_NEXT_IN_LINE') return 'fila';
  // A troca (troca-pela-notificacao): o toque leva a fila, onde a troca acontece.
  if (
    type === 'SWAP_REQUESTED' ||
    type === 'SWAP_OFFERED' ||
    type === 'EARLIER_TURN_OFFERED' ||
    type === 'SWAP_ACCEPTED' ||
    type === 'SWAP_OFFER_ACCEPTED' ||
    // aviso-de-falta-como-atraso (DEC-86): a falta vale como atraso; o cliente segue na fila.
    type === 'LATE_MARKED'
  ) {
    return 'fila';
  }
  const known =
    type === 'ATTENDANCE_STARTED' ||
    type === 'ATTENDANCE_FINISHED' ||
    type === 'ATTENDANCE_PROMOTED' ||
    type === 'ATTENDANCE_CANCELLED' ||
    type.startsWith('CUT_');
  return known ? 'attendances' : null;
}

// Dependências nativas injetadas (expo-notifications/expo-device) — mantém a
// máquina de permissão 100% testável sem tocar em módulo nativo.
export type PushEnv = {
  isDevice: boolean;
  getPermissionsAsync: () => Promise<{ status: string; canAskAgain?: boolean }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  /** Já houve a caixa do sistema neste aparelho (persistido por quem chama). */
  jaPerguntou?: () => Promise<boolean>;
  marcarPerguntado?: () => Promise<void>;
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

/**
 * A caixa do sistema ainda pode vir? No Android 13+ o expo-notifications
 * responde `denied` (e nao `undetermined`) para quem NUNCA foi perguntado: o
 * `areNotificationsEnabled()` e falso antes da permissao (bateria 10/10 08:06 —
 * a tela 10 nunca aparecia e o token nunca vinha). Quem decide e o
 * `canAskAgain`; o "ja perguntamos" fica com a chave de quem chama.
 */
export function aindaDaParaPedir(p: { status: string; canAskAgain?: boolean }): boolean {
  return p.status !== 'granted' && p.canAskAgain !== false;
}

// Pede permissão (se preciso) e devolve o Expo Push Token com o MOTIVO do
// desfecho. Best-effort: nunca lança — quem chama não pode quebrar por push.
export async function acquireExpoPushToken(env: PushEnv): Promise<ResultadoPush> {
  // Emulador/web não recebem push remoto — nem pede permissão.
  if (!env.isDevice) return { token: null, motivo: 'emulador' };

  try {
    const atual = await env.getPermissionsAsync();
    let status = atual.status;
    // Pede só quando ainda não foi respondida (Andre, 02/10: a caixa voltava a
    // cada abertura). Negou uma vez, fica negado até ele mudar nos ajustes.
    if (aindaDaParaPedir(atual) && !(await env.jaPerguntou?.())) {
      await env.marcarPerguntado?.();
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

/**
 * O push que chega com o app ABERTO vira aviso com "OK" (Andre, 26/09: "deve
 * haver um botao de OK quando for avisar que estamos proximo do corte"). O
 * banner do sistema passa rapido e some; o aviso fica ate o toque. Sem texto
 * nenhum, nao ha o que mostrar.
 */
export function avisoDoPush(conteudo: { title?: string | null; body?: string | null }): { titulo: string; mensagem: string } | null {
  const titulo = (conteudo.title ?? '').trim();
  const mensagem = (conteudo.body ?? '').trim();
  if (!titulo && !mensagem) return null;
  return { titulo: titulo || 'VUPTH', mensagem };
}

/**
 * Notificacao de ciencia com o app FECHADO (Andre, 02/10): a que so informa
 * ganha o botao "OK" na propria notificacao, que so a fecha. Aparece quando o
 * Backend manda `categoryId: "CIENCIA"` — mesmo id do Partner.
 */
export const CATEGORIA_CIENCIA = 'CIENCIA';
export const ACAO_OK = 'OK';

/**
 * Toda notificacao tem botao (notificacao-com-botao, Andre 15/10, DEC-43). Alem
 * do "OK" da CIENCIA, as que levam a uma tela ganham um botao que ABRE o app e
 * segue o mesmo caminho do toque no corpo (`notificationRoute`). O Backend
 * escolhe a categoria de cada push pelo `categoryId`.
 */
export const CATEGORIAS_COM_BOTAO: { categoria: string; acao: string; titulo: string }[] = [
  { categoria: 'VER_FILA', acao: 'VER_FILA', titulo: 'Ver minha vez' },
  { categoria: 'VER_ATENDIMENTO', acao: 'VER_ATENDIMENTO', titulo: 'Ver atendimento' },
  // notificacao-avaliar (CLI-33): o push de concluido (ATTENDANCE_FINISHED).
  { categoria: 'AVALIAR', acao: 'AVALIAR', titulo: 'Avaliar' },
  // pagamento-ja-paguei (24/10): o PAYMENT_REFUSED chega com a categoria PAGAR e abre o pagamento.
  { categoria: 'PAGAR', acao: 'PAGAR', titulo: 'Pagar' },
];

/**
 * O atendimento a avaliar de um push de concluido (notificacao-avaliar, CLI-33):
 * o toque (no corpo ou no "Avaliar") abre a avaliacao dele.
 */
export function atendimentoParaAvaliar(data: unknown): string | null {
  const d = (data ?? {}) as { type?: unknown; attendanceId?: unknown };
  return d.type === 'ATTENDANCE_FINISHED' && typeof d.attendanceId === 'string' && d.attendanceId
    ? d.attendanceId
    : null;
}

/**
 * O pagamento que o push abre (pagamento-ja-paguei e push-acoes-por-pergunta, 24/10): PAYMENT_REFUSED
 * (o profissional não confirmou o "Já paguei"; abre com o aviso para conferir) e PAYMENT_PENDING
 * (categoria PAGAR). O toque, no corpo ou no "Pagar", abre o Pix do atendimento.
 */
export function pagamentoDoPush(data: unknown): { attendanceId: string; recusado: boolean } | null {
  const d = (data ?? {}) as { type?: unknown; attendanceId?: unknown };
  if (typeof d.attendanceId !== 'string' || !d.attendanceId) return null;
  if (d.type === 'PAYMENT_REFUSED') return { attendanceId: d.attendanceId, recusado: true };
  if (d.type === 'PAYMENT_PENDING') return { attendanceId: d.attendanceId, recusado: false };
  return null;
}

/**
 * AGENDA_OPENED (agenda-da-semana-nao-liberada, 24/10, Backend 651514f): o profissional abriu o dia
 * pedido; o pedido venceu e o toque leva ao agendamento dele (a loja, no profissional).
 */
export function agendaAbertaDoPush(data: unknown): { establishmentId: string; professionalId: string } | null {
  const d = (data ?? {}) as { type?: unknown; establishmentId?: unknown; professionalId?: unknown };
  if (d.type !== 'AGENDA_OPENED') return null;
  return typeof d.establishmentId === 'string' && d.establishmentId && typeof d.professionalId === 'string' && d.professionalId
    ? { establishmentId: d.establishmentId, professionalId: d.professionalId }
    : null;
}

/** Canal Android HIGH novo, id "alertas" combinado com o Backend e o Partner (o "default" antigo nao sobe de importancia). */
export const CANAL_ALERTAS = 'alertas';

/** O toque foi no botao OK: so fecha a notificacao, nao abre tela. */
export function tocouNoOk(resposta: { actionIdentifier: string }): boolean {
  return resposta.actionIdentifier === ACAO_OK;
}
