import { useEffect } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";

import { WS_URL } from "@services/api";
import { EstablishmentWithProfessionals } from "@services/establishmentService";

const TOKEN_KEY = "vupth_access_token";

/**
 * Assina o tempo real da fila de um establishment via STOMP (backend secao 18b).
 *
 * Topico publico `/topic/establishment/{id}/queue` reenvia o snapshot COMPLETO da
 * fila (identico ao GET .../professionals-with-queue) a cada mudanca. Atualizamos
 * direto o cache do react-query usado por `useProfessionalsWithQueue` (apenas o
 * array `professionals`), deixando o polling/refetch como fallback se o socket cair.
 */
export function useQueueSocket(establishmentId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!establishmentId) return;

    let active = true;
    let client: Client | null = null;

    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!active) return;

      const topic = `/topic/establishment/${establishmentId}/queue`;

      client = new Client({
        webSocketFactory: () => new WebSocket(WS_URL),
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        reconnectDelay: 5000,
        // Workaround obrigatorio do @stomp/stompjs no React Native: o WebSocket
        // nativo "engole" o byte NULL que termina cada frame STOMP. Sem isto o
        // CONNECTED chega mas o parser nunca o reconhece e a conexao trava.
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
        onConnect: () => {
          client?.subscribe(topic, (message: IMessage) => {
            try {
              const snapshot = JSON.parse(
                message.body,
              ) as EstablishmentWithProfessionals;
              queryClient.setQueryData(
                ["professionals-with-queue", establishmentId],
                snapshot.professionals ?? [],
              );
            } catch (e) {
              if (__DEV__) console.log("[ws] erro ao processar snapshot", e);
            }
          });
        },
        onWebSocketError: () => {
          if (__DEV__) console.log(`[ws] falha no handshake (${WS_URL})`);
        },
      });

      client.activate();
    })();

    return () => {
      active = false;
      client?.deactivate();
    };
  }, [establishmentId, queryClient]);
}
