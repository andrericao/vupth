import { useEffect } from "react";
import { Alert } from "react-native";
import { Client, type IMessage } from "@stomp/stompjs";
import * as SecureStore from "expo-secure-store";

import { WS_URL } from "@services/api";
import { useQueueStore } from "@stores/queueStore";
import { QueueNotification } from "@domain/queue/types";

const TOKEN_KEY = "vupth_access_token";

/**
 * Assina as notificacoes pessoais do cliente via STOMP (backend secao 18b).
 *
 * Destino autenticado `/user/queue/notifications` entrega eventos direcionados ao
 * usuario da sessao: `ATTENDANCE_STARTED` ("é a sua vez!") e `ATTENDANCE_FINISHED`.
 * Exibimos um alerta in-app e refletimos o status na fila ativa (queueStore).
 * Push real (app em background) depende do backend #3 (device token) — fora deste escopo.
 *
 * @param enabled so conecta quando ha fila ativa / usuario autenticado.
 */
export function useQueueNotifications(enabled: boolean) {
  const updateQueue = useQueueStore((s) => s.updateQueue);

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
                if (notif.type === "ATTENDANCE_STARTED") {
                  updateQueue({ status: "IN_PROGRESS" });
                  Alert.alert("É a sua vez! 🎉", notif.message);
                } else if (notif.type === "ATTENDANCE_FINISHED") {
                  updateQueue({ status: "FINISHED" });
                  Alert.alert("Atendimento concluído", notif.message);
                }
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
  }, [enabled, updateQueue]);
}
