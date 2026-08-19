import { useQuery } from '@tanstack/react-query';
import { establishmentService } from '../services/establishmentService';
import { useLocationStore } from '@stores/locationStore';

export function useEstablishments() {
  const coords = useLocationStore((s) => s.coords);

  return useQuery({
    // As coordenadas entram na CHAVE: o GPS costuma chegar depois da primeira
    // busca (a permissão é assíncrona) e, sem isso, o React Query devolveria
    // para sempre a lista sem distância que já estava em cache.
    queryKey: ['establishments', coords?.latitude ?? null, coords?.longitude ?? null],
    queryFn: () => establishmentService.getAll(coords).then((res) => res.data),
    staleTime: 60000,
    // WebSocket ainda não funciona no device → polling para atualizar sozinho
    // (tempos de espera) sem puxar. Só roda com o app em foreground.
    refetchInterval: 60000,
    retry: 2,
    retryDelay: (attempt) => Math.min(3000 * (attempt + 1), 10000),
  });
}

export function useEstablishment(id: string) {
  return useQuery({
    queryKey: ['establishment', id],
    queryFn: () => establishmentService.getById(id).then((res) => res.data),
    enabled: !!id,
    staleTime: 60000,
  });
}

export function useProfessionalsWithQueue(establishmentId: string) {
  return useQuery({
    queryKey: ['professionals-with-queue', establishmentId],
    queryFn: () =>
      establishmentService
        .getProfessionalsWithQueue(establishmentId)
        .then((res) => res.data.professionals ?? []),
    enabled: !!establishmentId,
    staleTime: 30000,
    // Fila do estabelecimento atualiza sozinha (WS fora do ar) enquanto a tela
    // está aberta — fila/tempos andam sem o usuário puxar.
    refetchInterval: 20000,
  });
}
