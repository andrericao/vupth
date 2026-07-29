import { useEffect } from "react";
import { Alert } from "react-native";
import { Client, type IMessage } from "@stomp/stompjs";
import * as SecureStore from "expo-secure-store";

import { WS_URL } from "@services/api";
import { useQueueStore } from "@stores/queueStore";
import { QueueNotification } from "@domain/queue/types";
import { handleQueueNotification } from "@domain/queue/notifications";

const TOKEN_KEY = "vupth_access_token";

/**
 * Assina as notificacoes pessoais do cliente via STOMP (backend secao 18b).
 *
 * Destino autenticado `/user/queue/notifications` entrega eventos direcionados ao
 * usuario da sessao: `ATTENDANCE_STARTED`/`FINISHED`/`CANCELLED`/`PROMOTED` —
 * a reacao fica em `handleQueueNotification` (dominio puro, testavel).
 * Push real (app em background) segue pendente no client (registrar device token
 * via expo-notifications = modulo NATIVO -> novo eas build; follow-up).
 *
 * @param enabled so conecta quando ha fila ativa / usuario autenticado.
 */
export function useQueueNotifications(enabled: boolean) {
  const updateQueue = useQueueStore((s) => s.updateQueue);
  const leaveQueue = useQueueStore((s) => s.leaveQueue);

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
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
        onConnect: () => {
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
  }, [enabled, updateQueue, leaveQueue]);
}
