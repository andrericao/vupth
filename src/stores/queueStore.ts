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
  /**
   * Minutos estimados ate a vez. `null` = AINDA NAO SABEMOS — quem entra na
   * fila por aceite de pedido de corte, ou quem tem a fila reconciliada na
   * abertura, fica assim ate o primeiro `wait-time` responder.
   *
   * Era `0` nesses casos, e zero na tela vira "Agora" — a informacao mais
   * perigosa que existe aqui, porque faz o cliente sair de casa. Com o
   * profissional em ALMOCO, foi exatamente o que aconteceu (Andre, 17/09).
   */
  estimatedMinutes: number | null;
  status: AttendanceStatus;
  /** ms — ate quando sair e de graca (D13). So existe quando o SERVIDOR informa. */
  toleranceUntil?: number | null;
  /** Quanto a saida custaria agora, SEGUNDO O SERVIDOR (D4). Ausente = regra de hoje. */
  exitPenaltyValue?: number | null;
  /** Atrasos que contam (wait-time) — o aviso de atraso diz "este é o seu Nº". */
  lateCount?: number | null;
  // Preenchidos quando o atendimento inicia (IN_PROGRESS): início real (ms) e
  // duração estimada do serviço (min) — para tempo decorrido + término estimado.
  startedAt?: number;
  serviceMinutes?: number;
  // Posição na fila (1 = próximo). Vem do mesmo GET que já traz o tempo de
  // espera; a Home mostra "Faltam N" a partir dela.
  position?: number;
  // Posição na PRIMEIRA leitura desta fila. Guardada uma vez e nunca mais
  // mexida: é o que permite dizer "você já passou N pessoas" (progresso feito),
  // e não só quantas faltam. Sem ela a tela só sabe o que resta.
  initialPosition?: number;
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
