import { Establishment, ServiceType } from './types';

/**
 * Filtra a lista de estabelecimentos da Home.
 * - busca por nome (case-insensitive)
 * - filtro por categoria (serviceType)
 * - sem busca, só abertos (com busca, mostra abertos e fechados)
 * - esconde estabelecimentos SEM profissional disponível: o backend sinaliza
 *   isso com `estimated_wait_minutes === null` na listagem GET /establishment.
 *   (undefined — ex.: mocks/legado — NÃO é escondido.)
 */
export function filterEstablishments(
  establishments: Establishment[],
  search: string,
  selectedFilter: ServiceType | 'ALL',
): Establishment[] {
  const isSearching = search.trim().length > 0;

  return establishments.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = selectedFilter === 'ALL' || e.serviceType === selectedFilter;
    const matchesOpen = isSearching || e.open_status === 'OPEN';
    const hasProfessionals = e.estimated_wait_minutes !== null;
    return matchesSearch && matchesFilter && matchesOpen && hasProfessionals;
  });
}
