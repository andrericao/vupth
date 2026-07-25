import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import { UserLocation } from '@domain/establishment/proximity';

// Localização escolhida pelo cliente p/ ordenar a Home por proximidade (Fase 1).
// Persistida entre reaberturas. Fonte: endereço principal (logado) ou CEP/ViaCEP
// (visitante). Quando o backend filtrar por região/GPS (Fases 2/3), isto alimenta
// os query params.
const LOCATION_KEY = 'vupth_location';

interface LocationState {
  location: UserLocation | null;
  setLocation: (loc: UserLocation) => Promise<void>;
  clearLocation: () => Promise<void>;
  restoreLocation: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
  location: null,

  setLocation: async (loc) => {
    set({ location: loc });
    try {
      await SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(loc));
    } catch {}
  },

  clearLocation: async () => {
    set({ location: null });
    try {
      await SecureStore.deleteItemAsync(LOCATION_KEY);
    } catch {}
  },

  restoreLocation: async () => {
    try {
      const json = await SecureStore.getItemAsync(LOCATION_KEY);
      if (json) set({ location: JSON.parse(json) });
    } catch {}
  },
}));
