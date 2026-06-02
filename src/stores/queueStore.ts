import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface ActiveQueue {
  attendanceId?: string;
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  establishmentName: string;
}

interface QueueState {
  activeQueue: ActiveQueue | null;
  joinQueue: (queue: ActiveQueue) => Promise<void>;
  leaveQueue: () => Promise<void>;
  restoreQueue: () => Promise<void>;
}

const QUEUE_KEY = 'vupth_active_queue';

export const useQueueStore = create<QueueState>((set) => ({
  activeQueue: null,

  joinQueue: async (queue) => {
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(queue));
    set({ activeQueue: queue });
  },

  leaveQueue: async () => {
    await SecureStore.deleteItemAsync(QUEUE_KEY);
    set({ activeQueue: null });
  },

  restoreQueue: async () => {
    try {
      const json = await SecureStore.getItemAsync(QUEUE_KEY);
      if (json) {
        set({ activeQueue: JSON.parse(json) });
      }
    } catch {}
  },
}));
