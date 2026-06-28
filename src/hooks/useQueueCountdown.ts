import { useState, useEffect, useRef } from 'react';
import { useQueueStore, ActiveQueue } from '@stores/queueStore';
import { useAuthStore } from '@stores/authStore';
import { queueService } from '@services/queueService';
import { reconcileQueueEstimate } from '@domain/queue/types';

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
  return 60000;
}

export function useQueueCountdown() {
  const activeQueue = useQueueStore((s) => s.activeQueue);
  const updateQueue = useQueueStore((s) => s.updateQueue);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [remaining, setRemaining] = useState(0);
  const [urgency, setUrgency] = useState<UrgencyLevel>('normal');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!activeQueue) return;

    const timer = setInterval(() => {
      const r = getRemainingMinutes(activeQueue);
      setRemaining(r);
      setUrgency(getUrgency(r, activeQueue.status));
    }, 30000);

    // initial calc via interval trick
    const immediate = setTimeout(() => {
      const r = getRemainingMinutes(activeQueue);
      setRemaining(r);
      setUrgency(getUrgency(r, activeQueue.status));
    }, 0);

    return () => {
      clearInterval(timer);
      clearTimeout(immediate);
    };
  }, [activeQueue]);

  useEffect(() => {
    if (!activeQueue || !accessToken) return;

    const poll = async () => {
      try {
        if (activeQueue.attendanceId && user?.id) {
          const { data } = await queueService.getWaitTime(
            activeQueue.attendanceId,
            user.id,
            accessToken,
          );
          // Mantém o countdown monotônico (não pula pra cima a cada poll).
          const reconciled = reconcileQueueEstimate(
            { enteredAt: activeQueue.enteredAt, estimatedMinutes: activeQueue.estimatedMinutes },
            data.estimatedWaitingTime,
            Date.now(),
          );
          if (reconciled) {
            updateQueue(reconciled);
          }

          if (data.totalRemainingMinutes <= 0) {
            updateQueue({ status: 'SCHEDULED' });
          }
        }
      } catch {}
    };

    const r = getRemainingMinutes(activeQueue);
    const interval = getPollingInterval(r);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeQueue, accessToken, user?.id, updateQueue]);

  const color = activeQueue ? URGENCY_COLORS[urgency] : URGENCY_COLORS.normal;

  return {
    remaining,
    urgency,
    color,
    isInQueue: !!activeQueue && activeQueue.status === 'SCHEDULED',
    isBeingAttended: !!activeQueue && activeQueue.status === 'IN_PROGRESS',
    isPaused: !!activeQueue && activeQueue.status === 'PAUSED',
    isFinished: !!activeQueue && activeQueue.status === 'FINISHED',
    activeQueue,
  };
}
