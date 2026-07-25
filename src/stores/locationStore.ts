import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import { UserLocation } from '@domain/establishment/proximity';

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
}

interface LocationState extends Persisted {
  setLocation: (loc: UserLocation) => Promise<void>;
  clearLocation: () => Promise<void>;
  restoreLocation: () => Promise<void>;
}

async function persist(data: Persisted) {
  try {
    await SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(data));
  } catch {}
}

export const useLocationStore = create<LocationState>((set) => ({
  location: null,
  resolved: false,

  setLocation: async (loc) => {
    set({ location: loc, resolved: true });
    await persist({ location: loc, resolved: true });
  },

  clearLocation: async () => {
    set({ location: null, resolved: true });
    await persist({ location: null, resolved: true });
  },

  restoreLocation: async () => {
    try {
      const json = await SecureStore.getItemAsync(LOCATION_KEY);
      if (json) {
        const data = JSON.parse(json) as Partial<Persisted>;
        set({ location: data.location ?? null, resolved: !!data.resolved });
      }
    } catch {}
  },
}));

export { LOCATION_KEY };
