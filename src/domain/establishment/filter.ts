import { Establishment, ServiceType } from './types';
import { resolveRating } from './rating';

/** Nota usada para exibição/ordenação: maior estrela (rating_best) → média → placeholder. */
function ratingValue(e: Establishment): number {
  return resolveRating(e.rating_best ?? e.rating_average, e.rating_count, e.id).value;
}

/**
 * Ordena a lista da Home: **menor tempo de espera primeiro** (asc; sem
 * disponibilidade/`null` por último) e, no **empate de tempo, maior avaliação
 * primeiro** (desc). Estável para itens totalmente iguais.
 */
export function sortEstablishments(list: Establishment[]): Establishment[] {
  return [...list].sort((a, b) => {
    const wa = a.estimated_wait_minutes ?? Number.POSITIVE_INFINITY;
    const wb = b.estimated_wait_minutes ?? Number.POSITIVE_INFINITY;
    if (wa !== wb) return wa - wb;
    return ratingValue(b) - ratingValue(a); // empate de tempo → melhor avaliado antes
  });
}

/**
 * Filtra a lista de estabelecimentos da Home.
 * - busca por nome (case-insensitive)
 * - filtro por categoria (serviceType)
 * - **ABERTA**: esconde quem não tem profissional com serviço — o backend
 *   sinaliza com `estimated_wait_minutes === null` na listagem GET /establishment.
 *   (undefined — ex.: mocks/legado — NÃO é escondido.)
 * - **FECHADA**: só aparece se tiver profissional afiliado COM serviço
 *   (`available_professionals > 0`), pra o cliente poder **agendar** pra
 *   reabertura — não adianta mostrar loja fechada sem ninguém. Enquanto o
 *   backend não expõe `available_professionals` na listagem (HANDOFF seção 11),
 *   o campo vem `undefined` → **todas as fechadas ficam escondidas** (interim).
 */
export function filterEstablishments(
  establishments: Establishment[],
  search: string,
  selectedFilter: ServiceType | 'ALL',
): Establishment[] {
  return establishments.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = selectedFilter === 'ALL' || e.serviceType === selectedFilter;
    const visibleByAvailability =
      e.open_status === 'OPEN'
        ? e.estimated_wait_minutes !== null
        : (e.available_professionals ?? 0) > 0;
    return matchesSearch && matchesFilter && visibleByAvailability;
  });
}
