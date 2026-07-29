import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// Conta quantas vezes cada funcionalidade "em breve" (aguardando backend) foi
// tocada — assim o Andre vê, pela tela de Config., QUAIS fizeram mais falta e
// devem ser priorizadas quando o endpoint existir. Persistido no device.
const COMING_SOON_KEY = 'vupth_coming_soon_taps';

interface ComingSoonState {
  counts: Record<string, number>;
  tap: (feature: string) => Promise<void>;
  restore: () => Promise<void>;
}

export const useComingSoonStore = create<ComingSoonState>((set, get) => ({
  counts: {},

  tap: async (feature) => {
    const counts = { ...get().counts, [feature]: (get().counts[feature] ?? 0) + 1 };
    await SecureStore.setItemAsync(COMING_SOON_KEY, JSON.stringify(counts));
    set({ counts });
  },

  restore: async () => {
    try {
      const json = await SecureStore.getItemAsync(COMING_SOON_KEY);
      if (json) set({ counts: JSON.parse(json) });
    } catch {}
  },
}));
