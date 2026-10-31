import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { establishmentService } from '../services/establishmentService';
import { useLocationStore } from '@stores/locationStore';
import { useTelaEmFoco } from '@hooks/useTelaEmFoco';
import { dadosFrescos } from '@domain/establishment/frescor';
import { coordsDaLista, listaPodeBuscar } from '@domain/location/abertura';
import { comoPagina, juntarPaginas, proximaPagina } from '@domain/establishment/paginacao';

/** `ligado: false` segura a busca — a Home so a usa com busca ou categoria. */
export function useEstablishments(ligado: boolean = true) {
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
    enabled: ligado && listaPodeBuscar({ hydrated, gpsPending }),
    staleTime: 60000,
    // WebSocket ainda não funciona no device → polling para atualizar sozinho
    // (tempos de espera) sem puxar. Só roda com o app em foreground.
    refetchInterval: ligado ? 60000 : false,
    retry: 2,
    retryDelay: (attempt) => Math.min(3000 * (attempt + 1), 10000),
  });

  // Com a busca segurada e sem dado, o v5 diz `isLoading: false` — e as telas
  // leriam "nenhuma loja". Sem dado ainda é carregando, seguro ou não.
  return { ...query, isLoading: query.isPending, frescos: dadosFrescos(query.dataUpdatedAt) };
}

/**
 * Lista do "Pra ontem" — so busca quando o modo esta ligado. A mesma espera
 * pela localizacao decidida da Home, e um poll mais curto: quem tem pressa
 * precisa da espera de agora.
 */
export function usePraOntem(ligado: boolean) {
  const coords = coordsDaLista(useLocationStore((s) => s.coords));
  const hydrated = useLocationStore((s) => s.hydrated);
  const gpsPending = useLocationStore((s) => s.gpsPending);

  const query = useQuery({
    queryKey: ['pra-ontem', coords?.latitude ?? null, coords?.longitude ?? null],
    queryFn: () => establishmentService.getPraOntem(coords).then((res) => res.data),
    enabled: ligado && listaPodeBuscar({ hydrated, gpsPending }),
    staleTime: 30000,
    refetchInterval: ligado ? 30000 : false,
    retry: 2,
    retryDelay: (attempt) => Math.min(3000 * (attempt + 1), 10000),
  });

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
  const emFoco = useTelaEmFoco();
  return useQuery({
    queryKey: ['professionals-with-queue', establishmentId],
    queryFn: () =>
      establishmentService
        .getProfessionalsWithQueue(establishmentId)
        .then((res) => res.data.professionals ?? []),
    enabled: !!establishmentId,
    staleTime: 30000,
    // Fila do estabelecimento atualiza sozinha (WS fora do ar) enquanto a tela
    // está em foco — fila/tempos andam sem o usuário puxar.
    refetchInterval: emFoco ? 20000 : false,
  });
}

/**
 * So LE o snapshot da loja que a tela da loja (atras na pilha) mantem em dia
 * pelo WS e pelo polling — nao busca nem faz polling por conta propria.
 */
export function useSnapshotDaLoja(establishmentId: string) {
  return useQuery({
    queryKey: ['professionals-with-queue', establishmentId],
    queryFn: () =>
      establishmentService
        .getProfessionalsWithQueue(establishmentId)
        .then((res) => res.data.professionals ?? []),
    enabled: false,
  }).data;
}

/**
 * Horário por dia da semana da loja (C22). Muda raramente — `staleTime` longo,
 * sem polling: quem precisa de "aberta AGORA" usa `is_open`, que vem na
 * listagem e na tela da loja.
 */
export function useEstablishmentHours(establishmentId: string) {
  return useQuery({
    queryKey: ['establishment-hours', establishmentId],
    queryFn: () => establishmentService.getHours(establishmentId).then((res) => res.data),
    enabled: !!establishmentId,
    staleTime: 10 * 60 * 1000,
    // Loja antiga (ou backend sem a rota) devolve 404: não insistir.
    retry: false,
  });
}

/**
 * A vitrine da Home em paginas de 20 (lista-paginada, 03/10): a primeira ao
 * abrir, a proxima ao chegar no fim da lista, enquanto `hasNext`. A mesma
 * espera pela localizacao decidida e o mesmo poll da lista inteira — o poll
 * relê as paginas ja carregadas.
 */
export function useVitrinePaginada(ligado: boolean) {
  const coords = coordsDaLista(useLocationStore((s) => s.coords));
  const hydrated = useLocationStore((s) => s.hydrated);
  const gpsPending = useLocationStore((s) => s.gpsPending);

  const query = useInfiniteQuery({
    queryKey: ['establishments-paginas', coords?.latitude ?? null, coords?.longitude ?? null],
    queryFn: ({ pageParam }) =>
      establishmentService.getPage(pageParam, coords).then((res) => comoPagina(res.data, pageParam)),
    initialPageParam: 0,
    getNextPageParam: proximaPagina,
    enabled: ligado && listaPodeBuscar({ hydrated, gpsPending }),
    staleTime: 60000,
    refetchInterval: ligado ? 60000 : false,
    retry: 2,
    retryDelay: (attempt) => Math.min(3000 * (attempt + 1), 10000),
  });

  const data = query.data ? juntarPaginas(query.data.pages) : undefined;
  return { ...query, data, isLoading: query.isPending, frescos: dadosFrescos(query.dataUpdatedAt) };
}
