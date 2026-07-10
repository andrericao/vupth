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
 * - **abertos e fechados aparecem** (sempre): o cliente pode querer manifestar
 *   interesse / agendar para quando o estabelecimento reabrir, então fechado NÃO
 *   é escondido. A ordenação joga os fechados pro fim (sem wait → por último).
 * - **só nas ABERTAS** esconde quem não tem profissional disponível: o backend
 *   sinaliza isso com `estimated_wait_minutes === null` na listagem
 *   GET /establishment. (undefined — ex.: mocks/legado — NÃO é escondido.)
 *   Nas fechadas o wait é irrelevante (não dá pra entrar na fila agora), então
 *   não filtramos por disponibilidade.
 */
export function filterEstablishments(
  establishments: Establishment[],
  search: string,
  selectedFilter: ServiceType | 'ALL',
): Establishment[] {
  return establishments.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = selectedFilter === 'ALL' || e.serviceType === selectedFilter;
    const isOpen = e.open_status === 'OPEN';
    // Aberta: esconde se não há profissional (wait null). Fechada: sempre mostra.
    const visibleByAvailability = isOpen ? e.estimated_wait_minutes !== null : true;
    return matchesSearch && matchesFilter && visibleByAvailability;
  });
}
