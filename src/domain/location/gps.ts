import { UserLocation } from '@domain/establishment/proximity';
import { siglaDaUf } from '@utils/cep';

// GPS (Fase 3 do filtro por localidade, prioridade Andre 2026-08-01). O app pede
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
  // Usados ao preencher um ENDEREÇO pelo GPS (tela de endereços).
  street?: string | null;
  streetNumber?: string | null;
  postalCode?: string | null;
  name?: string | null;
}

/** Campos de endereço que o GPS consegue preencher (os demais o cliente digita). */
export interface AddressDraft {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export type PermissionOutcome = 'granted' | 'denied';

export interface LocationProviders {
  requestPermission: () => Promise<PermissionOutcome>;
  /** Lê a permissão SEM perguntar — para as aberturas depois da primeira. */
  checkPermission?: () => Promise<PermissionOutcome>;
  getCoords: () => Promise<Coords>;
  reverseGeocode: (coords: Coords) => Promise<ReverseGeocodeResult[]>;
}

export interface DeviceLocation {
  coords: Coords;
  location: UserLocation | null; // null = coordenadas ok, mas sem endereço legível
  raw: ReverseGeocodeResult | null; // resultado cru, p/ preencher formulário de endereço
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
  // O Android costuma trazer o estado por extenso ("Santa Catarina"): vira a
  // sigla, que e o que o campo UF, o backend e a ordenacao por proximidade usam.
  const regiao = (result.region ?? '').trim();
  const state = (regiao && siglaDaUf(regiao)) || regiao;

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
    const raw = results?.[0] ?? null;
    return { coords, location: toUserLocation(raw), raw };
  } catch {
    return { coords, location: null, raw: null };
  }
}

/**
 * Converte o reverse geocode nos campos do formulário de endereço (Andre
 * 2026-08-01: ao incluir/editar endereço, oferecer o preenchimento por GPS).
 * Só devolve o que veio — campo ausente fica de fora para NÃO apagar o que o
 * cliente já tinha digitado. O CEP vem sem máscara (a tela aplica a dela).
 */
export function toAddressDraft(result?: ReverseGeocodeResult | null): AddressDraft {
  if (!result) return {};

  const street = (result.street ?? result.name ?? '').trim();
  const number = (result.streetNumber ?? '').trim();
  const neighborhood = (result.district ?? '').trim();
  const city = (result.city ?? result.subregion ?? '').trim();
  // O Android costuma trazer o estado por extenso ("Santa Catarina"): vira a
  // sigla, que e o que o campo UF, o backend e a ordenacao por proximidade usam.
  const regiao = (result.region ?? '').trim();
  const state = (regiao && siglaDaUf(regiao)) || regiao;
  const zipCode = (result.postalCode ?? '').replace(/\D/g, '');

  return {
    ...(street ? { street } : {}),
    ...(number ? { number } : {}),
    ...(neighborhood ? { neighborhood } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(zipCode.length === 8 ? { zipCode } : {}),
  };
}
