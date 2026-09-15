import { useEffect } from "react";
import { AppState } from "react-native";
import { Client, type IMessage } from "@stomp/stompjs";
import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";

import { WS_URL } from "@services/api";
import { EstablishmentWithProfessionals } from "@services/establishmentService";
import { useWsDiagnosticsStore } from "@stores/wsDiagnosticsStore";
import { shouldReconnectOnForeground } from "@domain/ws/diagnostics";

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
    const diag = useWsDiagnosticsStore.getState();

    (async () => {
      if (!active) return;

      const topic = `/topic/establishment/${establishmentId}/queue`;
      diag.markConnecting("public");

      client = new Client({
        webSocketFactory: () => new WebSocket(WS_URL),
        reconnectDelay: 5000,
        // ⚠️ 2026-08-01: `forceBinaryWSFrames` + `appendMissingNULLonIncoming`
        // REMOVIDAS. O comentario antigo dizia que eram "workaround obrigatorio
        // do RN" — nao sao: a pagina `tools/ws-test.html` conecta neste mesmo
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
        // O frame CONNECTED carrega `heart-beat` e `user-name` — os dois dados
        // que decidem qualquer teste de WS. Vão para o store e aparecem em
        // Configurações; num binário instalado, `console.log` seria invisível.
        onConnect: (frame) => {
          diag.markConnected("public", frame?.headers ?? {});
          client?.subscribe(topic, (message: IMessage) => {
            diag.markMessage("public");
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
        // Captura o MOTIVO: sem ele o painel so dizia "falhou o handshake", que
        // nao aponta causa nenhuma (teste do Andre, 2026-08-07).
        onWebSocketError: (event: any) => {
          const motivo =
            event?.message ?? event?.reason ?? event?.type ?? "erro sem descricao";
          diag.markError("public", `${motivo} · ${WS_URL}`);
          if (__DEV__) console.log(`[ws] falha no handshake (${WS_URL})`);
        },
        onStompError: (frame) => {
          diag.markError("public", `STOMP: ${frame?.headers?.message ?? "erro"}`);
        },
      });

      client.activate();
    })();

    // C18 — o Android suspende o processo e o socket morre SEM evento. Pior
    // desde que o servidor passou a mandar heartbeat: a sessão suspensa é
    // derrubada em ~10s em vez de ficar pendurada, então voltar do background
    // desconectado virou o caso comum, não a exceção.
    const sub = AppState.addEventListener("change", (next) => {
      if (!shouldReconnectOnForeground(next, client?.connected ?? false)) return;
      client?.deactivate().then(() => {
        if (active) client?.activate();
      });
    });

    return () => {
      active = false;
      sub.remove();
      diag.markClosed("public");
      client?.deactivate();
    };
  }, [establishmentId, queryClient]);
}
