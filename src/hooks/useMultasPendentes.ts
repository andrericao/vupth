import { useEffect, useState } from "react";

import { penaltyService, PendingPenaltiesResponse } from "@services/penaltyService";
import { useAuthStore } from "@stores/authStore";

/**
 * As multas que entram no proximo atendimento — so de quem tem conta. Uma
 * leitura ao abrir a escolha de servicos, como a dos proprios servicos; falha
 * de rede nao trava a tela (a conta fica sem multa).
 */
export function useMultasPendentes(): { data: PendingPenaltiesResponse | null } {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<PendingPenaltiesResponse | null>(null);
  useEffect(() => {
    if (!accessToken) return;
    let vivo = true;
    penaltyService
      .listPending(accessToken)
      .then((r) => {
        if (vivo) setData(r.data);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [accessToken]);
  return { data };
}
