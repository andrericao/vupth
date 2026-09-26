import { AppState, type NativeEventSubscription } from "react-native";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import * as SecureStore from "expo-secure-store";

import { WS_URL } from "@services/api";
import { useWsDiagnosticsStore } from "@stores/wsDiagnosticsStore";
import type { WsChannel } from "@domain/ws/diagnostics";
import { shouldReconnectOnForeground } from "@domain/ws/diagnostics";

const TOKEN_KEY = "vupth_access_token";

// UMA conexao STOMP para o app inteiro (C17, reportado pelo Partner): ate 26/09
// o Client abria DUAS — uma do topico da loja (`useQueueSocket`) e outra do
// canal pessoal (`useQueueNotifications`) —, o dobro de sockets no servidor para
// o mesmo usuario. O Partner ja usava uma com duas assinaturas.
//
// Quem precisa de um destino chama `assinar()` e recebe a funcao de sair. A
// conexao nasce com a primeira assinatura e fecha com a ultima; ao (re)conectar,
// todas as assinaturas vivas sao refeitas.
//
// O que ja valia nos dois hooks continua valendo aqui, uma vez so:
// - token lido a CADA tentativa (partner C16): o access token dura 1h e o
//   `reconnectDelay` reconecta sozinho — capturado no mount, a reconexao levava
//   o header vencido e o canal autenticado morria calado;
// - sem `forceBinaryWSFrames`/`appendMissingNULLonIncoming` (01/08: atrapalham
//   o parse com o Spring correto);
// - C18: o Android suspende o processo e o socket morre sem evento — ao voltar
//   ao primeiro plano desconectado, reconecta.

type Assinatura = {
  destino: string;
  canal: WsChannel;
  aoReceber: (mensagem: IMessage) => void;
  stomp: StompSubscription | null;
};

let cliente: Client | null = null;
let aoVoltar: NativeEventSubscription | null = null;
const assinaturas = new Set<Assinatura>();

const diag = () => useWsDiagnosticsStore.getState();
const canaisVivos = () => new Set([...assinaturas].map((a) => a.canal));

function assinarNoStomp(a: Assinatura) {
  if (!cliente?.connected) return;
  a.stomp = cliente.subscribe(a.destino, (m) => {
    diag().markMessage(a.canal);
    a.aoReceber(m);
  });
}

function conectar() {
  canaisVivos().forEach((c) => diag().markConnecting(c));
  const c = new Client({
    webSocketFactory: () => new WebSocket(WS_URL),
    reconnectDelay: 5000,
    beforeConnect: async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      c.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    },
    // O frame CONNECTED traz `heart-beat` e `user-name` — o que decide qualquer
    // teste de WS (anonimo = canal pessoal mudo). Vai para o painel de cada canal.
    onConnect: (frame) => {
      canaisVivos().forEach((canal) => diag().markConnected(canal, frame?.headers ?? {}));
      assinaturas.forEach(assinarNoStomp);
    },
    onWebSocketError: (event: any) => {
      const motivo = event?.message ?? event?.reason ?? event?.type ?? "erro sem descricao";
      canaisVivos().forEach((canal) => diag().markError(canal, `${motivo} · ${WS_URL}`));
    },
    onStompError: (frame) => {
      canaisVivos().forEach((canal) => diag().markError(canal, `STOMP: ${frame?.headers?.message ?? "erro"}`));
    },
  });
  cliente = c;
  aoVoltar = AppState.addEventListener("change", (proximo) => {
    if (!shouldReconnectOnForeground(proximo, c.connected)) return;
    c.deactivate().then(() => {
      if (cliente === c) c.activate();
    });
  });
  c.activate();
}

function desconectar() {
  aoVoltar?.remove();
  aoVoltar = null;
  const c = cliente;
  cliente = null;
  c?.deactivate();
}

/**
 * Assina um destino na conexao unica. Devolve a funcao que desfaz a assinatura
 * (e fecha a conexao, se era a ultima).
 */
export function assinar(destino: string, canal: WsChannel, aoReceber: (m: IMessage) => void): () => void {
  const a: Assinatura = { destino, canal, aoReceber, stomp: null };
  const canalNovo = !canaisVivos().has(canal);
  assinaturas.add(a);
  if (!cliente) {
    conectar();
  } else if (cliente.connected) {
    if (canalNovo) diag().markConnected(canal, {});
    assinarNoStomp(a);
  } else if (canalNovo) {
    diag().markConnecting(canal);
  }

  return () => {
    if (!assinaturas.delete(a)) return;
    try {
      a.stomp?.unsubscribe();
    } catch {
      // Conexao ja caiu: nao ha o que desfazer no servidor.
    }
    if (!canaisVivos().has(canal)) diag().markClosed(canal);
    if (assinaturas.size === 0) desconectar();
  };
}

/** So para testes: quantas conexoes existem (0 ou 1) e quantas assinaturas. */
export function estadoDaConexao() {
  return { conexoes: cliente ? 1 : 0, assinaturas: assinaturas.size };
}
