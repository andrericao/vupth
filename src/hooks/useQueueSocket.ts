import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { EstablishmentWithProfessionals } from "@services/establishmentService";
import { assinar } from "@services/stompCompartilhado";

/**
 * Assina o tempo real da fila de um establishment via STOMP (backend secao 18b).
 *
 * Topico publico `/topic/establishment/{id}/queue` reenvia o snapshot COMPLETO da
 * fila (identico ao GET .../professionals-with-queue) a cada mudanca. Atualizamos
 * direto o cache do react-query usado por `useProfessionalsWithQueue` (apenas o
 * array `professionals`), deixando o polling/refetch como fallback se o socket cair.
 *
 * A conexao e a UNICA do app (`stompCompartilhado`, C17): este hook so assina e
 * desassina o topico.
 */
export function useQueueSocket(establishmentId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!establishmentId) return;
    return assinar(`/topic/establishment/${establishmentId}/queue`, "public", (message) => {
      try {
        const snapshot = JSON.parse(message.body) as EstablishmentWithProfessionals;
        queryClient.setQueryData(["professionals-with-queue", establishmentId], snapshot.professionals ?? []);
      } catch (e) {
        if (__DEV__) console.log("[ws] erro ao processar snapshot", e);
      }
    });
  }, [establishmentId, queryClient]);
}
