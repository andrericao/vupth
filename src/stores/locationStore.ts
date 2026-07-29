import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import { UserLocation } from '@domain/establishment/proximity';
import { Coords } from '@domain/location/gps';

// Localização escolhida pelo cliente p/ ordenar a Home por proximidade (Fase 1).
// Persistida entre reaberturas. Fonte: endereço principal (logado) ou CEP/ViaCEP
// (visitante). Quando o backend filtrar por região/GPS (Fases 2/3), isto alimenta
// os query params.
//
// `resolved` = o cliente já teve uma localidade DEFINIDA ou EXPLICITAMENTE limpou
// ("Ver todos"). A Home só auto-preenche do endereço do logado quando NÃO
// resolvido — assim quem limpou o filtro não o vê voltar sozinho.
const LOCATION_KEY = 'vupth_location';

interface Persisted {
  location: UserLocation | null;
  resolved: boolean;
  // GPS (Fase 3): coordenadas do device, guardadas para o dia em que o backend
  // aceitar `?lat&lng&radiusKm` (B7). Hoje só o bairro/cidade derivado delas é
  // usado (ordenação da Fase 1).
  coords?: Coords | null;
  // Já pedimos a permissão de localização alguma vez? Evita re-perguntar a cada
  // abertura para quem negou (o SO também não mostraria o diálogo de novo).
  gpsAsked?: boolean;
}

interface LocationState extends Persisted {
  setLocation: (loc: UserLocation) => Promise<void>;
  setCoords: (coords: Coords) => Promise<void>;
  markGpsAsked: () => Promise<void>;
  clearLocation: () => Promise<void>;
  restoreLocation: () => Promise<void>;
}

async function persist(data: Persisted) {
  try {
    await SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(data));
  } catch {}
}

export const useLocationStore = create<LocationState>((set, get) => ({
  location: null,
  resolved: false,
  coords: null,
  gpsAsked: false,

  setLocation: async (loc) => {
    set({ location: loc, resolved: true });
    const { coords, gpsAsked } = get();
    await persist({ location: loc, resolved: true, coords, gpsAsked });
  },

  setCoords: async (coords) => {
    set({ coords });
    const { location, resolved, gpsAsked } = get();
    await persist({ location, resolved, coords, gpsAsked });
  },

  markGpsAsked: async () => {
    set({ gpsAsked: true });
    const { location, resolved, coords } = get();
    await persist({ location, resolved, coords, gpsAsked: true });
  },

  // Limpa o filtro ("Ver todos") — as coordenadas ficam: elas não são o filtro,
  // são o dado do device (e o cliente pode reativar o GPS sem nova permissão).
  clearLocation: async () => {
    set({ location: null, resolved: true });
    const { coords, gpsAsked } = get();
    await persist({ location: null, resolved: true, coords, gpsAsked });
  },

  restoreLocation: async () => {
    try {
      const json = await SecureStore.getItemAsync(LOCATION_KEY);
      if (json) {
        const data = JSON.parse(json) as Partial<Persisted>;
        set({
          location: data.location ?? null,
          resolved: !!data.resolved,
          coords: data.coords ?? null,
          gpsAsked: !!data.gpsAsked,
        });
      }
    } catch {}
  },
}));

export { LOCATION_KEY };
