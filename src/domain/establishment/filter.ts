import { Establishment, ServiceType, isEffectivelyOpen } from './types';
import { resolveRating } from './rating';

/** Nota usada para exibição/ordenação: maior estrela (rating_best) → média; sem avaliação, 0 (a loja nova vai para o fim do desempate). */
function ratingValue(e: Establishment): number {
  return resolveRating(e.rating_best ?? e.rating_average, e.rating_count).value;
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
 * O texto como a busca o compara: sem maiuscula e SEM ACENTO (Andre, 24/09: "a
 * pesquisa pelo salao deve desconsiderar maiusculas e minusculas e
 * acentuacao"). Quem digita "salao" num teclado sem acento tem de achar o
 * "Salão" — antes a busca dizia que nao havia nada.
 */
export function paraBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Filtra a lista de estabelecimentos da Home.
 * - busca por nome (sem maiuscula e sem acento — `paraBusca`)
 * - filtro por categoria (serviceType)
 * - **ABERTA AGORA** (`is_open` efetivo — inclui o horário de funcionamento):
 *   esconde quem não tem profissional com serviço — o backend sinaliza com
 *   `estimated_wait_minutes === null` na listagem GET /establishment.
 *   (undefined — ex.: mocks/legado — NÃO é escondido.)
 * - **FECHADA** (inclui loja OPEN **fora do horário** — feedback Andre
 *   2026-07-22): só aparece se tiver profissional afiliado COM serviço
 *   (`available_professionals > 0`), pra o cliente poder **agendar** pra
 *   reabertura — não adianta mostrar loja fechada sem ninguém.
 */
export function filterEstablishments(
  establishments: Establishment[],
  search: string,
  selectedFilter: ServiceType | 'ALL',
): Establishment[] {
  return establishments.filter((e) => {
    const matchesSearch = paraBusca(e.name).includes(paraBusca(search));
    const matchesFilter = selectedFilter === 'ALL' || e.serviceType === selectedFilter;
    const visibleByAvailability = isEffectivelyOpen(e)
      ? e.estimated_wait_minutes !== null
      : (e.available_professionals ?? 0) > 0;
    return matchesSearch && matchesFilter && visibleByAvailability;
  });
}
