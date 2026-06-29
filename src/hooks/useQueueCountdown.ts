import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueueStore, ActiveQueue } from '@stores/queueStore';
import { useAuthStore } from '@stores/authStore';
import { queueService } from '@services/queueService';
import { attendanceService } from '@services/attendanceService';
import { reconcileQueueEstimate, AttendanceStatus } from '@domain/queue/types';

export type UrgencyLevel = 'normal' | 'urgent';

export const URGENCY_COLORS = {
  normal: '#F59E0B',
  urgent: '#EF4444',
} as const;

function getRemainingMinutes(queue: ActiveQueue): number {
  const elapsed = (Date.now() - queue.enteredAt) / 60000;
  return Math.max(0, Math.round(queue.estimatedMinutes - elapsed));
}

function getUrgency(remaining: number, status: string): UrgencyLevel {
  if (status !== 'SCHEDULED') return 'normal';
  if (remaining <= 10) return 'urgent';
  return 'normal';
}

function getPollingInterval(remaining: number): number {
  if (remaining > 60) return 600000;
  if (remaining > 10) return 300000;
  if (remaining > 0) return 60000;
  return 30000; // aguardando chamada: checa status (START/FINISH) mais rápido
}

export function useQueueCountdown() {
  const activeQueue = useQueueStore((s) => s.activeQueue);
  const updateQueue = useQueueStore((s) => s.updateQueue);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [remaining, setRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [urgency, setUrgency] = useState<UrgencyLevel>('normal');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!activeQueue) return;

    const tick = () => {
      const r = getRemainingMinutes(activeQueue);
      setRemaining(r);
      setUrgency(getUrgency(r, activeQueue.status));
      // tempo decorrido desde o início do atendimento (IN_PROGRESS)
      if (activeQueue.startedAt) {
        setElapsed(Math.max(0, Math.floor((Date.now() - activeQueue.startedAt) / 60000)));
      } else {
        setElapsed(0);
      }
    };

    const timer = setInterval(tick, 30000);
    const immediate = setTimeout(tick, 0); // cálculo inicial

    return () => {
      clearInterval(timer);
      clearTimeout(immediate);
    };
  }, [activeQueue]);

  useEffect(() => {
    if (!activeQueue || !accessToken) return;

    // Um ciclo de atualização. Lê o estado fresco da fila via getState.
    const poll = async () => {
      const q = useQueueStore.getState().activeQueue;
      if (!q?.attendanceId || !user?.id) return;

      // 1. Tempo de espera (pode falhar quando o atendimento sai da fila / vira
      //    IN_PROGRESS) — isolado para NÃO impedir a checagem de status abaixo.
      try {
        const { data } = await queueService.getWaitTime(q.attendanceId, user.id, accessToken);
        const reconciled = reconcileQueueEstimate(
          { enteredAt: q.enteredAt, estimatedMinutes: q.estimatedMinutes },
          data.estimatedWaitingTime,
          Date.now(),
        );
        if (reconciled) updateQueue(reconciled);
      } catch {}

      // 2. Status real do atendimento (fallback do WebSocket): reflete
      //    IN_PROGRESS/FINISHED na tela. Roda SEMPRE, mesmo se o wait-time falhar.
      try {
        const hist = await attendanceService.listClientHistory(accessToken);
        const mine = hist.data.find((a) => a.id === q.attendanceId);
        if (mine) {
          const patch: Partial<ActiveQueue> = {};
          if (mine.status !== q.status) patch.status = mine.status as AttendanceStatus;
          // Ao iniciar o atendimento, guarda o início real e a duração estimada
          // (soma dos serviços) para exibir tempo decorrido + término estimado.
          if (mine.status === 'IN_PROGRESS' && mine.startTime && !q.startedAt) {
            patch.startedAt = Date.parse(mine.startTime);
            patch.serviceMinutes = mine.services.reduce((s, x) => s + (x.estimatedMinutes ?? 0), 0);
          }
          if (Object.keys(patch).length > 0) updateQueue(patch);
        }
      } catch {}
    };

    // expõe o ciclo para o pull-to-refresh (sempre a versão mais recente).
    pollRef.current = poll;

    const r = getRemainingMinutes(activeQueue);
    const interval = getPollingInterval(r);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeQueue, accessToken, user?.id, updateQueue]);

  const refresh = useCallback(() => pollRef.current(), []);

  const color = activeQueue ? URGENCY_COLORS[urgency] : URGENCY_COLORS.normal;

  return {
    remaining,
    elapsed,
    urgency,
    color,
    isInQueue: !!activeQueue && activeQueue.status === 'SCHEDULED',
    isBeingAttended: !!activeQueue && activeQueue.status === 'IN_PROGRESS',
    isPaused: !!activeQueue && activeQueue.status === 'PAUSED',
    isFinished: !!activeQueue && activeQueue.status === 'FINISHED',
    activeQueue,
    refresh,
  };
}
