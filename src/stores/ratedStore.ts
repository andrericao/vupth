import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// IDs de atendimentos que o cliente JÁ avaliou. Workaround front-only pra esconder
// o "Avaliar" de forma persistente (entre reaberturas do app) enquanto o backend
// não expõe `rated` no GET /attendances/client/me (HANDOFF §3.1). Quando o backend
// entregar, este store vira só um cache/fallback da fonte da verdade.
const RATED_KEY = 'vupth_rated_attendances';

interface RatedState {
  ids: string[];
  isRated: (attendanceId: string) => boolean;
  markRated: (attendanceId: string) => Promise<void>;
  restoreRated: () => Promise<void>;
}

export const useRatedStore = create<RatedState>((set, get) => ({
  ids: [],

  isRated: (attendanceId) => get().ids.includes(attendanceId),

  markRated: async (attendanceId) => {
    if (get().ids.includes(attendanceId)) return;
    const ids = [...get().ids, attendanceId];
    await SecureStore.setItemAsync(RATED_KEY, JSON.stringify(ids));
    set({ ids });
  },

  restoreRated: async () => {
    try {
      const json = await SecureStore.getItemAsync(RATED_KEY);
      if (json) set({ ids: JSON.parse(json) });
    } catch {}
  },
}));
