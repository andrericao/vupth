import { useQuery } from "@tanstack/react-query";

import { penaltyService } from "@services/penaltyService";
import { useAuthStore } from "@stores/authStore";

/**
 * O cliente com 3 faltas em 90 dias paga o corte adiantado (GET
 * /clients/me/absences). Le so quando a agenda esta aberta; sem conta ou com
 * falha de rede, nao exige nada — o agendar nunca e barrado por isto (DEC-115).
 */
export function usePagamentoAdiantado(aberto: boolean): boolean {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data } = useQuery({
    queryKey: ["faltas-do-cliente"],
    queryFn: () => penaltyService.absences(accessToken!).then((r) => r.data),
    enabled: !!accessToken && aberto,
    staleTime: 30000,
  });
  return data?.prepay_required === true;
}

/** O motivo em uma linha e o que fazer (guia de texto). */
export const AVISO_DE_PAGAMENTO_ADIANTADO =
  "Você tem 3 faltas. Pague o corte ao profissional (Pix) e mostre a ele.";
