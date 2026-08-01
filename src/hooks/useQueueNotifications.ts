import { useEffect } from "react";
import { Alert } from "react-native";
import { Client, type IMessage } from "@stomp/stompjs";
import * as SecureStore from "expo-secure-store";

import { WS_URL } from "@services/api";
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
 * ⚠️ Diagnostico 2026-07-29 (`src/docs/ws-test.html`): o servidor STOMP sempre
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

    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!active || !token) return;

      client = new Client({
        webSocketFactory: () => new WebSocket(WS_URL),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        onConnect: () => {
          if (__DEV__) console.log("[ws] conectado");

          client?.subscribe(
            "/user/queue/notifications",
            (message: IMessage) => {
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
        onWebSocketError: () => {
          if (__DEV__) console.log(`[ws] falha no handshake notif (${WS_URL})`);
        },
      });

      client.activate();
    })();

    return () => {
      active = false;
      client?.deactivate();
    };
  }, [enabled, updateQueue, leaveQueue, reanchorQueue, establishmentId]);
}
