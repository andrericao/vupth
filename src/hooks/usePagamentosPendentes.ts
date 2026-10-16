import { useQuery } from "@tanstack/react-query";

import { paymentService } from "@services/paymentService";
import { useAuthStore } from "@stores/authStore";

export const CHAVE_PENDENTES = ["pagamentos-pendentes"] as const;

/**
 * Os pagamentos que o cliente ainda deve (GET /clients/me/pending-payments):
 * finalizados com PENDING ou AWAITING_CONFIRMATION (pendencia-de-pagamento).
 */
export function usePagamentosPendentes() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: CHAVE_PENDENTES,
    queryFn: () => paymentService.pendentes(accessToken!).then((r) => r.data.items ?? []),
    enabled: !!accessToken,
    staleTime: 30000,
  });
}
