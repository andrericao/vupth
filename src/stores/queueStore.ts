import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AttendanceStatus } from '@domain/queue/types';

export interface ActiveQueue {
  attendanceId?: string;
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  establishmentName: string;
  enteredAt: number;
  estimatedMinutes: number;
  status: AttendanceStatus;
  // Preenchidos quando o atendimento inicia (IN_PROGRESS): início real (ms) e
  // duração estimada do serviço (min) — para tempo decorrido + término estimado.
  startedAt?: number;
  serviceMinutes?: number;
}

interface QueueState {
  activeQueue: ActiveQueue | null;
  joinQueue: (queue: ActiveQueue) => Promise<void>;
  updateQueue: (partial: Partial<ActiveQueue>) => Promise<void>;
  // Re-ancora o countdown ao "agora" com uma nova estimativa (após ações que
  // mudam a posição: move-to-end, troca #42). O Date.now() vive aqui, fora do
  // render, driblando o guard monotônico do poll de forma explícita.
  reanchorQueue: (estimatedMinutes: number) => Promise<void>;
  leaveQueue: () => Promise<void>;
  restoreQueue: () => Promise<void>;
}

const QUEUE_KEY = 'vupth_active_queue';

export const useQueueStore = create<QueueState>((set, get) => ({
  activeQueue: null,

  joinQueue: async (queue) => {
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(queue));
    set({ activeQueue: queue });
  },

  updateQueue: async (partial) => {
    const current = get().activeQueue;
    if (!current) return;
    const updated = { ...current, ...partial };
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(updated));
    set({ activeQueue: updated });
  },

  reanchorQueue: async (estimatedMinutes) => {
    const current = get().activeQueue;
    if (!current) return;
    const updated = { ...current, enteredAt: Date.now(), estimatedMinutes };
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(updated));
    set({ activeQueue: updated });
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
