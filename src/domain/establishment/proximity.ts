import { Establishment } from './types';
import { sortEstablishments } from './filter';

// Filtro por localidade (Fase 1, front-only — Andre 2026-07-23). Um cliente novo
// no CE não deveria ver as mesmas lojas de quem está em SC. Enquanto o backend
// não filtra por região (Fase 2) nem por GPS/Haversine (Fase 3), ordenamos a
// Home por PROXIMIDADE usando o `address` que já vem em cada estabelecimento.
//
// ⚠️ Bairro NÃO é único (quase toda cidade tem "Centro") → a chave é sempre
// cidade + bairro (idealmente + UF).

export interface UserLocation {
  city: string;
  neighborhood?: string;
  state?: string; // UF
}

// Normaliza p/ comparar: sem acento, sem espaços nas pontas, minúsculo.
function norm(s?: string | null): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Faixa de proximidade de um estabelecimento em relação à localização do cliente:
 * 0 = mesmo bairro E cidade · 1 = mesma cidade · 2 = outra cidade / sem endereço.
 * Quando há UF definida dos dois lados, exige UF igual para contar como "mesma cidade"
 * (evita confundir cidades homônimas em estados diferentes).
 */
export function proximityRank(e: Establishment, loc: UserLocation): number {
  const addr = e.address;
  if (!addr || norm(loc.city) === '') return 2;

  const sameCity = norm(addr.city) === norm(loc.city);
  const sameState = !loc.state || !addr.state || norm(addr.state) === norm(loc.state);
  if (!sameCity || !sameState) return 2;

  if (loc.neighborhood && norm(loc.neighborhood) !== '' &&
      norm(addr.neighborhood) === norm(loc.neighborhood)) {
    return 0;
  }
  return 1;
}

/**
 * Ordena a Home por proximidade (mesmo bairro → mesma cidade → resto) e, DENTRO
 * de cada faixa, pela ordem padrão (menor espera / melhor avaliação). Sem
 * localização definida → cai na ordem padrão (`sortEstablishments`).
 */
export function sortByProximity(
  list: Establishment[],
  loc: UserLocation | null,
): Establishment[] {
  if (!loc || norm(loc.city) === '') return sortEstablishments(list);

  const groups: [Establishment[], Establishment[], Establishment[]] = [[], [], []];
  for (const e of list) groups[proximityRank(e, loc)].push(e);

  return [
    ...sortEstablishments(groups[0]),
    ...sortEstablishments(groups[1]),
    ...sortEstablishments(groups[2]),
  ];
}
