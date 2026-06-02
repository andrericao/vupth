import { useState, useEffect, useCallback } from 'react';
import { useQueueStore, ActiveQueue } from '@stores/queueStore';
import { queueService } from '@services/queueService';

export type UrgencyLevel = 'normal' | 'warning' | 'urgent';

export const URGENCY_COLORS = {
  normal: '#F59E0B',
  warning: '#EF4444',
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
  const leaveQueue = useQueueStore((s) => s.leaveQueue);

  const [remaining, setRemaining] = useState(0);
  const [urgency, setUrgency] = useState<UrgencyLevel>('normal');

  const recalculate = useCallback(() => {
    if (!activeQueue) return;
    const r = getRemainingMinutes(activeQueue);
    setRemaining(r);
    setUrgency(getUrgency(r, activeQueue.status));
  }, [activeQueue]);

  // Countdown local — atualiza a cada 30s
  useEffect(() => {
    if (!activeQueue) return;
    recalculate();
    const timer = setInterval(recalculate, 30000);
    return () => clearInterval(timer);
  }, [activeQueue, recalculate]);

  // Polling adaptativo — sync com backend
  useEffect(() => {
    if (!activeQueue) return;

    const r = getRemainingMinutes(activeQueue);
    const interval = getPollingInterval(r);

    const poll = async () => {
      try {
        const { data } = await queueService.getPosition(activeQueue.professionalId);
        if (data.estimatedWaitMinutes !== undefined) {
          updateQueue({
            estimatedMinutes: data.estimatedWaitMinutes,
            enteredAt: Date.now(),
          });
        }
      } catch {}
    };

    const timer = setInterval(poll, interval);
    return () => clearInterval(timer);
  }, [activeQueue?.professionalId, remaining > 60, remaining > 10]);

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
