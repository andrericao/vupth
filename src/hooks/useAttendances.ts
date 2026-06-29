import { useQuery } from "@tanstack/react-query";

import { attendanceService, ClientAttendanceFilters } from "@services/attendanceService";
import { useAuthStore } from "@stores/authStore";

/**
 * Historico de atendimentos do cliente logado (GET /attendances/client/me).
 * O clientId vem do JWT. Filtros opcionais: status, dateFrom, dateTo.
 */
export function useClientAttendances(filters?: ClientAttendanceFilters) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: ["client-attendances", filters ?? null],
    queryFn: () =>
      attendanceService
        .listClientHistory(accessToken!, filters)
        .then((res) => res.data),
    enabled: !!accessToken,
    staleTime: 30000,
    // WS fora do ar → atualiza sozinho enquanto a tela está aberta.
    refetchInterval: 30000,
  });
}
