import { useQuery } from "@tanstack/react-query";

import { intentionsService } from "@services/intentionsService";
import { useAuthStore } from "@stores/authStore";
import { useTelaEmFoco } from "@hooks/useTelaEmFoco";

/**
 * "Meus agendamentos": intenções futuras do cliente logado + frames por
 * profissional (GET /attendances/intentions/client/me). O clientId vem do JWT.
 * Poll de 30s (WS instável no device); a promoção some da lista sozinha
 * (INTENTION → SCHEDULED) e o atendimento aparece na fila/histórico.
 */
export function useClientIntentions() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const emFoco = useTelaEmFoco();

  return useQuery({
    queryKey: ["client-intentions"],
    queryFn: () => intentionsService.getClientAgenda(accessToken!).then((res) => res.data),
    enabled: !!accessToken,
    staleTime: 30000,
    refetchInterval: emFoco ? 30000 : false,
  });
}
