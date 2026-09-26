import { useEffect } from "react";
import { Alert } from "react-native";

import { assinar } from "@services/stompCompartilhado";
import { useQueueStore } from "@stores/queueStore";
import { QueueNotification, AttendanceStatus } from "@domain/queue/types";
import { handleQueueNotification } from "@domain/queue/notifications";
import { findMyPosition, QueueBroadcast } from "@domain/queue/broadcast";

/**
 * Tempo real da fila via STOMP. Assina DOIS destinos, na conexao UNICA do app
 * (`stompCompartilhado`, C17 — antes cada hook abria a sua):
 *
 * 1. `/user/queue/notifications` (pessoal, autenticado) — eventos dirigidos a
 *    mim: `ATTENDANCE_STARTED`/`FINISHED`/`CANCELLED`/`PROMOTED`/`CUT_*`/
 *    `SWAP_OFFER_ACCEPTED`. A reacao vive em `handleQueueNotification`.
 * 2. `/topic/establishment/{id}/queue` (broadcast) — a fila inteira a cada
 *    mudanca. Dai sai a MINHA posicao/espera em tempo real (`findMyPosition`),
 *    que antes so vinha do polling de ate 2min.
 *
 * @param enabled so assina quando ha fila ativa / usuario autenticado.
 */
export function useQueueNotifications(enabled: boolean) {
  const updateQueue = useQueueStore((s) => s.updateQueue);
  const leaveQueue = useQueueStore((s) => s.leaveQueue);
  const reanchorQueue = useQueueStore((s) => s.reanchorQueue);
  const establishmentId = useQueueStore((s) => s.activeQueue?.establishmentId);

  useEffect(() => {
    if (!enabled) return;

    const sairPessoal = assinar("/user/queue/notifications", "personal", (message) => {
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
    });

    // Fila do estabelecimento: reflete posicao/espera sem esperar o poll.
    const sairDaFila = establishmentId
      ? assinar(`/topic/establishment/${establishmentId}/queue`, "personal", (message) => {
          try {
            const payload = JSON.parse(message.body) as QueueBroadcast;
            const mine = findMyPosition(payload, useQueueStore.getState().activeQueue?.attendanceId);
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
        })
      : () => {};

    return () => {
      sairPessoal();
      sairDaFila();
    };
  }, [enabled, updateQueue, leaveQueue, reanchorQueue, establishmentId]);
}
