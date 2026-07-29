import { UserLocation } from '@domain/establishment/proximity';

// GPS (Fase 3 do filtro por localidade, prioridade Andre 2026-07-29). O app pede
// a permissão de localização na primeira abertura, pega as coordenadas e faz
// REVERSE GEOCODE no próprio device (expo-location, nativo e gratuito — nada de
// API paga) para descobrir bairro/cidade/UF. Isso já alimenta o `sortByProximity`
// da Fase 1 sem o cliente digitar CEP.
//
// As COORDENADAS ficam guardadas para quando o backend entregar o B7
// (`GET /establishment?lat&lng&radiusKm` com Haversine) — aí vira distância real.
//
// Este arquivo é PURO/injetável: nenhuma dependência do módulo nativo, para
// rodar no jest e para o app não quebrar num binário sem expo-location.

export interface Coords {
  latitude: number;
  longitude: number;
}

// Subconjunto do que o `reverseGeocodeAsync` devolve (os campos variam por
// plataforma: no Android o bairro costuma vir em `district`; no iOS, em
// `subregion`/`district`).
export interface ReverseGeocodeResult {
  city?: string | null;
  subregion?: string | null;
  district?: string | null;
  region?: string | null;
  isoCountryCode?: string | null;
}

export type PermissionOutcome = 'granted' | 'denied';

export interface LocationProviders {
  requestPermission: () => Promise<PermissionOutcome>;
  getCoords: () => Promise<Coords>;
  reverseGeocode: (coords: Coords) => Promise<ReverseGeocodeResult[]>;
}

export interface DeviceLocation {
  coords: Coords;
  location: UserLocation | null; // null = coordenadas ok, mas sem endereço legível
}

/**
 * Monta a `UserLocation` do reverse geocode. `city` é obrigatória (é a chave da
 * ordenação); sem ela não dá para ranquear e devolvemos `null`. O bairro vem de
 * `district` (Android) ou `subregion` (iOS) — o primeiro que existir.
 */
export function toUserLocation(result?: ReverseGeocodeResult | null): UserLocation | null {
  if (!result) return null;
  const city = (result.city ?? result.subregion ?? '').trim();
  if (city === '') return null;

  const neighborhood = (result.district ?? '').trim();
  const state = (result.region ?? '').trim();

  return {
    city,
    ...(neighborhood ? { neighborhood } : {}),
    ...(state ? { state } : {}),
  };
}

/**
 * Fluxo completo: permissão → coordenadas → endereço. Devolve `null` quando o
 * cliente NEGA a permissão (caso normal, não é erro) — a Home segue com o
 * seletor manual de bairro/CEP. Erros do device (GPS desligado, timeout) sobem
 * para quem chamou decidir.
 */
export async function acquireDeviceLocation(
  providers: LocationProviders,
): Promise<DeviceLocation | null> {
  const permission = await providers.requestPermission();
  if (permission !== 'granted') return null;

  const coords = await providers.getCoords();

  // O endereço é um bônus: sem ele ainda guardamos as coordenadas (servem ao B7).
  try {
    const results = await providers.reverseGeocode(coords);
    return { coords, location: toUserLocation(results?.[0]) };
  } catch {
    return { coords, location: null };
  }
}
