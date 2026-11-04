import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { openWatchService, type PedidoDeAviso } from "@services/openWatchService";
import { useAuthStore } from "@stores/authStore";

export const CHAVE_AVISOS_DE_ABERTURA = ["avisos-de-abertura"] as const;

/** Os avisos de hoje do cliente (GET /open-watches/me). Sem login, nada: o aviso nao existe sem conta (DEC-160). */
export function useAvisosDeAbertura() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: CHAVE_AVISOS_DE_ABERTURA,
    queryFn: () => openWatchService.deHoje(accessToken!).then((r) => r.data ?? []),
    enabled: !!accessToken,
    staleTime: 30000,
  });
}

/** Pedir e cancelar um aviso; os dois recarregam a lista de hoje. */
export function useMudarAvisoDeAbertura() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const recarregar = () => queryClient.invalidateQueries({ queryKey: CHAVE_AVISOS_DE_ABERTURA });
  const pedir = useMutation({
    mutationFn: (pedido: PedidoDeAviso) => openWatchService.pedir(pedido, accessToken!),
    onSettled: recarregar,
  });
  const cancelar = useMutation({
    mutationFn: (id: string) => openWatchService.cancelar(id, accessToken!),
    onSettled: recarregar,
  });
  return { pedir, cancelar };
}
