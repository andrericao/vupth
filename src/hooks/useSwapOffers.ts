import { useQuery } from "@tanstack/react-query";

import { swapOfferService } from "@services/swapOfferService";
import { useAuthStore } from "@stores/authStore";

/**
 * Ofertas de troca (C13) que o cliente PODE aceitar naquele profissional — alimenta
 * o dot do botão "Trocar" e a lista de aceitar. Poll de 20s (WS instável no device).
 * Só busca quando há profissional + token + `enabled` (cliente aguardando na fila).
 */
export function useSwapOffers(professionalId: string | undefined, enabled: boolean) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: ["swap-offers-acceptable", professionalId],
    queryFn: () =>
      swapOfferService.listAcceptable(professionalId!, accessToken!).then((r) => r.data),
    enabled: enabled && !!professionalId && !!accessToken,
    staleTime: 20000,
    refetchInterval: 20000,
  });
}
