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

// ─────────────────────────────────────────────────────────────────────────────
// DISTÂNCIA REAL (GPS) — fatia B do backend, consumida em 2026-08-06
//
// O Haversine que existia AQUI foi REMOVIDO. O backend passou a devolver
// `distance_km` por item quando a busca manda `lat`/`lng`, e o contrato dele é
// explícito: o front NÃO recalcula. O motivo é concreto — se cada app fizesse a
// própria conta (arredondamento, raio da Terra, coordenada de origem), o client
// e o partner mostrariam números diferentes para a MESMA loja.
//
// Junto saiu a ordenação local por distância: com coordenadas, a ordem é a que
// o backend mandou (distância pura, decisão do Andre 2026-08-06), inclusive
// misturando lojas fechadas — elas carregam o badge âmbar AGENDAR, então o
// cliente entende que há caminho.

/** Rótulo curto do card: abaixo de 1 km vira metros arredondados a 50m. */
export function formatDistanceKm(km: number): string {
  if (km < 1) {
    const meters = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return `${meters} m`;
  }
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

/**
 * Ordem da Home.
 *
 * COM GPS: devolve a lista intocada — já veio ordenada por distância do
 * backend. Reordenar aqui só poderia piorar (e desfaria o desempate estável
 * por id que o backend faz para a paginação futura).
 *
 * SEM GPS: cai na Fase 1, ordenando por bairro/cidade do endereço.
 */
export function orderForHome(
  list: Establishment[],
  hasCoords: boolean,
  loc: UserLocation | null,
): Establishment[] {
  return hasCoords ? list : sortByProximity(list, loc);
}
