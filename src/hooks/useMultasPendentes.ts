import { useCallback, useEffect, useRef, useState } from "react";

import { penaltyService, PendingPenaltiesResponse } from "@services/penaltyService";
import { useAuthStore } from "@stores/authStore";

/**
 * As multas que entram no proximo atendimento — so de quem tem conta. Uma
 * leitura ao abrir a tela (e `refetch` ao voltar para ela); falha de rede nao
 * trava a tela (fica sem multa).
 */
export function useMultasPendentes(): { data: PendingPenaltiesResponse | null; refetch: () => void } {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<PendingPenaltiesResponse | null>(null);
  const vivo = useRef(true);
  const refetch = useCallback(() => {
    if (!accessToken) return;
    penaltyService
      .listPending(accessToken)
      .then((r) => {
        if (vivo.current) setData(r.data);
      })
      .catch(() => {});
  }, [accessToken]);
  useEffect(() => {
    vivo.current = true;
    refetch();
    return () => {
      vivo.current = false;
    };
  }, [refetch]);
  return { data, refetch };
}
