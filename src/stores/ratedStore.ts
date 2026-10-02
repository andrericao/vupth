import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// IDs de atendimentos que o cliente JÁ avaliou. A fonte da verdade é o `rated`
// do GET /attendances/client/me (Backend 3925ec3, ver `podeAvaliar`); este store
// cobre a nota recém-enviada até o refetch e a tela de fim de atendimento, que
// lê a fila local e não o histórico.
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
