/**
 * Leitura do frame CONNECTED do STOMP — o "Teste 0" pedido pelo backend
 * (2026-08-06), mas em vez de `console.log` (invisível num binário instalado)
 * o resultado vira estado que a tela de Configurações mostra.
 *
 * Os dois cabeçalhos que interessam:
 *
 * - `user-name`: o Principal que o backend associou à sessão. **VAZIO significa
 *   conexão ANÔNIMA** — e é aí que mora o S14: com token inválido/vencido o
 *   backend conecta como anônimo em vez de recusar, então o socket fica "vivo",
 *   o tópico público continua atualizando a fila normalmente e só o canal
 *   PESSOAL morre calado. É a assinatura do "às vezes não chega" que nunca foi
 *   explicada. Detectar isso aqui transforma uma falha silenciosa em visível.
 *
 * - `heart-beat`: "<servidor envia>,<servidor espera>" em ms. `0,0` = o servidor
 *   não manda batida nenhuma (S17), então um socket morto continua parecendo
 *   vivo e o `reconnectDelay` nunca dispara.
 */

export type WsChannel = "public" | "personal";
export type WsStatus = "idle" | "connecting" | "connected" | "error";

export type ConnectInfo = {
  /** Cru, como veio ("10000,10000"). `null` se o servidor não mandou. */
  heartBeat: string | null;
  /** Milissegundos que o SERVIDOR se compromete a enviar. 0 = não manda. */
  serverSendsMs: number;
  /** Milissegundos que o servidor espera receber. */
  serverExpectsMs: number;
  /** Principal da sessão. `null` = conectou ANÔNIMO. */
  userName: string | null;
  authenticated: boolean;
};

export function parseConnectHeaders(
  headers: Record<string, string> | undefined | null,
): ConnectInfo {
  const heartBeat = headers?.["heart-beat"] ?? null;
  const [sends, expects] = (heartBeat ?? "").split(",");

  // O Spring manda `user-name` só quando há Principal. String vazia conta como
  // ausente: é exatamente o caso anônimo, e tratá-la como nome esconderia o bug.
  const rawUser = headers?.["user-name"]?.trim();
  const userName = rawUser ? rawUser : null;

  return {
    heartBeat,
    serverSendsMs: Number.parseInt(sends ?? "", 10) || 0,
    serverExpectsMs: Number.parseInt(expects ?? "", 10) || 0,
    userName,
    authenticated: userName !== null,
  };
}

export type VerdictLevel = "ok" | "warn" | "bad" | "idle";
export type Verdict = { level: VerdictLevel; message: string };

/**
 * Traduz o estado de um canal para uma frase que decide o teste — em português,
 * porque quem lê é o Andre com o celular na mão, não um log.
 */
export function channelVerdict(
  channel: WsChannel,
  status: WsStatus,
  info: ConnectInfo | null,
): Verdict {
  if (status === "idle") {
    return { level: "idle", message: "Sem conexão (nenhuma fila ativa)" };
  }
  if (status === "connecting") {
    return { level: "idle", message: "Conectando..." };
  }
  if (status === "error") {
    return { level: "bad", message: "Falhou o handshake — nem chegou a conectar" };
  }
  if (!info) {
    return { level: "warn", message: "Conectado, mas sem o frame CONNECTED" };
  }

  // O caso que decide o S14. Só vale para o canal pessoal: o público não
  // depende de identidade e funciona igual anônimo.
  if (channel === "personal" && !info.authenticated) {
    return {
      level: "bad",
      message:
        "Conectado como ANÔNIMO — o servidor aceitou sem identificar quem é. As notificações pessoais NÃO vão chegar (S14).",
    };
  }

  if (info.serverSendsMs === 0) {
    return {
      level: "warn",
      message:
        "Conectado, mas o servidor não manda heartbeat (0). Se a conexão cair, o app pode não perceber (S17).",
    };
  }

  return {
    level: "ok",
    message: `Conectado${info.userName ? ` como ${info.userName}` : ""}, heartbeat de ${info.serverSendsMs / 1000}s`,
  };
}

/** Decide se voltar do background exige reconectar (C18). */
export function shouldReconnectOnForeground(
  appState: string,
  isConnected: boolean,
): boolean {
  return appState === "active" && !isConnected;
}

/** "há 12s" / "há 3min" — para o painel dizer se algo ainda está chegando. */
export function formatSince(at: number | null, now: number = Date.now()): string {
  if (at == null) return "nunca";
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes}min`;
  return `há ${Math.round(minutes / 60)}h`;
}
