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
      if (!active) return;

      const topic = `/topic/establishment/${establishmentId}/queue`;

      client = new Client({
        webSocketFactory: () => new WebSocket(WS_URL),
        reconnectDelay: 5000,
        // ⚠️ 2026-08-01: `forceBinaryWSFrames` + `appendMissingNULLonIncoming`
        // REMOVIDAS. O comentario antigo dizia que eram "workaround obrigatorio
        // do RN" — nao sao: a pagina `src/docs/ws-test.html` conecta neste mesmo
        // servidor SEM elas e recebe tudo. Com o Spring correto elas atrapalham
        // o parse (socket vivo, mensagem que nunca aparece).
        //
        // Token lido a CADA tentativa (partner C16): o access token dura 1h e o
        // `reconnectDelay` reconecta sozinho — capturado no mount, a reconexao
        // levava o header velho e o canal autenticado morria calado.
        beforeConnect: async () => {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          if (client) {
            client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
          }
        },
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
