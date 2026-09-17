import { useQuery } from '@tanstack/react-query';
import { establishmentService } from '../services/establishmentService';
import { useLocationStore } from '@stores/locationStore';
import { coordsDaLista, listaPodeBuscar } from '@domain/location/abertura';

export function useEstablishments() {
  const coords = coordsDaLista(useLocationStore((s) => s.coords));
  const hydrated = useLocationStore((s) => s.hydrated);
  const gpsPending = useLocationStore((s) => s.gpsPending);

  const query = useQuery({
    // As coordenadas entram na CHAVE: sem isso o React Query devolveria para
    // sempre a lista sem distância que já estava em cache. Por isso a busca só
    // sai com a localização DECIDIDA — antes, a chave mudava depois da primeira
    // busca e a lista era pedida duas ou três vezes por abertura.
    queryKey: ['establishments', coords?.latitude ?? null, coords?.longitude ?? null],
    queryFn: () => establishmentService.getAll(coords).then((res) => res.data),
    enabled: listaPodeBuscar({ hydrated, gpsPending }),
    staleTime: 60000,
    // WebSocket ainda não funciona no device → polling para atualizar sozinho
    // (tempos de espera) sem puxar. Só roda com o app em foreground.
    refetchInterval: 60000,
    retry: 2,
    retryDelay: (attempt) => Math.min(3000 * (attempt + 1), 10000),
  });

  // Com a busca segurada e sem dado, o v5 diz `isLoading: false` — e as telas
  // leriam "nenhuma loja". Sem dado ainda é carregando, seguro ou não.
  return { ...query, isLoading: query.isPending };
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
