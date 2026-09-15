import { useEffect } from "react";
import { Alert, AppState } from "react-native";
import { Client, type IMessage } from "@stomp/stompjs";
import * as SecureStore from "expo-secure-store";

import { WS_URL } from "@services/api";
import { useWsDiagnosticsStore } from "@stores/wsDiagnosticsStore";
import { shouldReconnectOnForeground } from "@domain/ws/diagnostics";
import { useQueueStore } from "@stores/queueStore";
import { QueueNotification, AttendanceStatus } from "@domain/queue/types";
import { handleQueueNotification } from "@domain/queue/notifications";
import { findMyPosition, QueueBroadcast } from "@domain/queue/broadcast";

const TOKEN_KEY = "vupth_access_token";

/**
 * Tempo real da fila via STOMP. Assina DOIS destinos:
 *
 * 1. `/user/queue/notifications` (pessoal, autenticado) — eventos dirigidos a
 *    mim: `ATTENDANCE_STARTED`/`FINISHED`/`CANCELLED`/`PROMOTED`/`CUT_*`/
 *    `SWAP_OFFER_ACCEPTED`. A reacao vive em `handleQueueNotification`.
 * 2. `/topic/establishment/{id}/queue` (broadcast) — a fila inteira a cada
 *    mudanca. Dai sai a MINHA posicao/espera em tempo real (`findMyPosition`),
 *    que antes so vinha do polling de ate 2min.
 *
 * ⚠️ Diagnostico 2026-08-01 (`tools/ws-test.html`): o servidor STOMP sempre
 * funcionou — handshake livre, JWT do frame CONNECT aceito, Principal setado e
 * broadcast publicando. O que quebrava o app eram as opcoes
 * `forceBinaryWSFrames` + `appendMissingNULLonIncoming`, que existem para
 * contornar servidores FORA do padrao e, com o Spring correto, atrapalham o
 * parse. Foram REMOVIDAS. Front-Partner: confira o mesmo no cliente de voces.
 *
 * @param enabled so conecta quando ha fila ativa / usuario autenticado.
 */
export function useQueueNotifications(enabled: boolean) {
  const updateQueue = useQueueStore((s) => s.updateQueue);
  const leaveQueue = useQueueStore((s) => s.leaveQueue);
  const reanchorQueue = useQueueStore((s) => s.reanchorQueue);
  const establishmentId = useQueueStore((s) => s.activeQueue?.establishmentId);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    let client: Client | null = null;
    const diag = useWsDiagnosticsStore.getState();

    (async () => {
      if (!active) return;

      diag.markConnecting("personal");
      client = new Client({
        webSocketFactory: () => new WebSocket(WS_URL),
        reconnectDelay: 5000,
        // Token lido a CADA tentativa de conexao (partner C16). Antes ele era
        // capturado UMA vez no mount e virava `connectHeaders` fixo: como o
        // access token dura 1h e o `reconnectDelay` reconecta sozinho, toda
        // reconexao seguinte ia com o header VENCIDO. E o backend, ao receber
        // token invalido, conecta como ANONIMO em vez de recusar (partner S14)
        // — resultado: socket "vivo" e `/user/queue/notifications` mudo para
        // sempre, sem erro nenhum. Candidato a causa-raiz do C14/C9.
        beforeConnect: async () => {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          if (client) {
            client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
          }
        },
        // `frame.headers` responde a pergunta que decide o S14: o `user-name`
        // veio preenchido, ou o backend nos aceitou como ANÔNIMO? Anônimo =
        // este canal está mudo para sempre, sem erro nenhum. O painel de
        // Configurações mostra isso em uma frase.
        onConnect: (frame) => {
          diag.markConnected("personal", frame?.headers ?? {});
          if (__DEV__) console.log("[ws] conectado", frame?.headers);

          client?.subscribe(
            "/user/queue/notifications",
            (message: IMessage) => {
              diag.markMessage("personal");
              try {
                const notif = JSON.parse(message.body) as QueueNotification;
                handleQueueNotification(notif, {
                  updateQueue,
                  leaveQueue,
                  alert: Alert.alert,
                  activeAttendanceId: useQueueStore.getState().activeQueue?.attendanceId,
                });
              } catch (e) {
                if (__DEV__) console.log("[ws] erro ao processar notificacao", e);
              }
            },
          );

          // Fila do estabelecimento: reflete posicao/espera sem esperar o poll.
          if (!establishmentId) return;
          client?.subscribe(
            `/topic/establishment/${establishmentId}/queue`,
            (message: IMessage) => {
              try {
                const payload = JSON.parse(message.body) as QueueBroadcast;
                const mine = findMyPosition(
                  payload,
                  useQueueStore.getState().activeQueue?.attendanceId,
                );
                // Nao estou na lista: pode ser transicao — quem conclui saida da
                // fila e o poll do /attendances/client/me (le o status real).
                if (!mine) return;

                const current = useQueueStore.getState().activeQueue;
                if (current && mine.status !== current.status) {
                  updateQueue({ status: mine.status as AttendanceStatus });
                }
                // Re-ancora o countdown pela fila recem-publicada.
                reanchorQueue(mine.minutesAhead);
              } catch (e) {
                if (__DEV__) console.log("[ws] erro ao processar fila", e);
              }
            },
          );
        },
        // Captura o MOTIVO: sem ele o painel so dizia "falhou o handshake", que
        // nao aponta causa nenhuma (teste do Andre, 2026-08-07).
        onWebSocketError: (event: any) => {
          const motivo =
            event?.message ?? event?.reason ?? event?.type ?? "erro sem descricao";
          diag.markError("personal", `${motivo} · ${WS_URL}`);
          if (__DEV__) console.log(`[ws] falha no handshake notif (${WS_URL})`);
        },
        onStompError: (frame) => {
          diag.markError("personal", `STOMP: ${frame?.headers?.message ?? "erro"}`);
        },
      });

      client.activate();
    })();

    // C18 — ver o comentário gêmeo em `useQueueSocket`. Aqui dói mais: é o
    // canal PESSOAL, o único que avisa "é a sua vez".
    const sub = AppState.addEventListener("change", (next) => {
      if (!shouldReconnectOnForeground(next, client?.connected ?? false)) return;
      client?.deactivate().then(() => {
        if (active) client?.activate();
      });
    });

    return () => {
      active = false;
      sub.remove();
      diag.markClosed("personal");
      client?.deactivate();
    };
  }, [enabled, updateQueue, leaveQueue, reanchorQueue, establishmentId]);
}
