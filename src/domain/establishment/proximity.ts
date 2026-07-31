import { Establishment } from './types';
import { sortEstablishments } from './filter';
import { Coords } from '@domain/location/gps';

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
// DISTÂNCIA REAL (GPS) — Andre 2026-07-29
//
// O backend entregou a fatia A do GPS (geocoding, 2026-07-27): o endereço do
// estabelecimento já pode trazer `latitude`/`longitude` na listagem. Com as
// coordenadas do device (expo-location) dá para calcular a distância AQUI, sem
// esperar o filtro por raio do backend (fatia B). Quem ainda não foi
// geocodificado simplesmente não mostra distância — nunca some da lista.

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Haversine: distância em km entre dois pontos (lat/lng em graus). */
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Distância do cliente até o estabelecimento, ou `null` quando falta coordenada
 * de algum dos lados (device sem GPS / loja ainda não geocodificada).
 */
export function establishmentDistanceKm(
  e: Establishment,
  from: Coords | null,
): number | null {
  const lat = e.address?.latitude;
  const lng = e.address?.longitude;
  if (!from || typeof lat !== 'number' || typeof lng !== 'number') return null;
  return haversineKm(from, { latitude: lat, longitude: lng });
}

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
 * Ordena com a MELHOR informação disponível: quem tem distância real vem
 * primeiro (do mais perto ao mais longe); o resto mantém a ordenação por
 * bairro/cidade da Fase 1. Sem coordenadas do device, cai inteiro na Fase 1.
 *
 * Não FILTRA de propósito — a lista nunca pode esvaziar porque a loja ainda não
 * foi geocodificada ou porque o cliente negou o GPS.
 */
export function sortByDistance(
  list: Establishment[],
  from: Coords | null,
  loc: UserLocation | null,
): Establishment[] {
  if (!from) return sortByProximity(list, loc);

  const withDistance: { e: Establishment; km: number }[] = [];
  const without: Establishment[] = [];

  for (const e of list) {
    const km = establishmentDistanceKm(e, from);
    if (km == null) without.push(e);
    else withDistance.push({ e, km });
  }

  return [
    ...withDistance.sort((a, b) => a.km - b.km).map((x) => x.e),
    ...sortByProximity(without, loc),
  ];
}
