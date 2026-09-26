import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueueStore, ActiveQueue } from '@stores/queueStore';
import { useAuthStore } from '@stores/authStore';
import { queueService } from '@services/queueService';
import { attendanceService } from '@services/attendanceService';
import { reconcileQueueEstimate, AttendanceStatus, saiuSemAtendimento } from '@domain/queue/types';

export type UrgencyLevel = 'normal' | 'urgent';

export const URGENCY_COLORS = {
  normal: '#F59E0B',
  urgent: '#EF4444',
} as const;

/** `null` enquanto o servidor nao disse a previsao — nao e "agora". */
function getRemainingMinutes(queue: ActiveQueue): number | null {
  if (queue.estimatedMinutes == null) return null;
  const elapsed = (Date.now() - queue.enteredAt) / 60000;
  return Math.max(0, Math.round(queue.estimatedMinutes - elapsed));
}

function getUrgency(remaining: number, status: string): UrgencyLevel {
  if (status !== 'SCHEDULED') return 'normal';
  if (remaining <= 10) return 'urgent';
  return 'normal';
}

function getPollingInterval(remaining: number | null): number {
  // Sem previsao, o poll e o que TRAZ a previsao: vai no ritmo mais curto.
  if (remaining == null) return 30000;
  // Teto de 2min: sem WebSocket, é o poll que detecta remoção pelo profissional
  // (CANCELLED) e mudanças de status — não pode demorar muito.
  if (remaining > 10) return 120000;
  if (remaining > 0) return 60000;
  return 30000; // aguardando chamada: checa status (START/FINISH) mais rápido
}

export function useQueueCountdown() {
  const activeQueue = useQueueStore((s) => s.activeQueue);
  const updateQueue = useQueueStore((s) => s.updateQueue);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [remaining, setRemaining] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [urgency, setUrgency] = useState<UrgencyLevel>('normal');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!activeQueue) return;

    const tick = () => {
      const r = getRemainingMinutes(activeQueue);
      setRemaining(r);
      // Sem previsao nao ha urgencia a declarar.
      setUrgency(r == null ? 'normal' : getUrgency(r, activeQueue.status));
    };

    const timer = setInterval(tick, 30000);
    const immediate = setTimeout(tick, 0); // cálculo inicial

    return () => {
      clearInterval(timer);
      clearTimeout(immediate);
    };
  }, [activeQueue]);

  // Tempo de atendimento rolando em SEGUNDOS — 100% no front a partir do
  // startedAt (cacheado no store/SecureStore). Sem backend; timer de 1s só roda
  // enquanto há atendimento em curso.
  useEffect(() => {
    const startedAt = activeQueue?.startedAt;
    const tick = () =>
      setElapsedSeconds(startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0);

    const immediate = setTimeout(tick, 0); // cálculo inicial (assíncrono)
    const id = startedAt ? setInterval(tick, 1000) : null;

    return () => {
      clearTimeout(immediate);
      if (id) clearInterval(id);
    };
  }, [activeQueue?.startedAt]);

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
        // Sem previsao ainda, a do servidor entra inteira — nao ha o que
        // reconciliar contra um numero que nunca existiu.
        const reconciled =
          q.estimatedMinutes == null
            ? { enteredAt: Date.now(), estimatedMinutes: data.estimatedWaitingTime }
            : reconcileQueueEstimate(
                { enteredAt: q.enteredAt, estimatedMinutes: q.estimatedMinutes },
                data.estimatedWaitingTime,
                Date.now(),
              );
        const patch: Partial<ActiveQueue> = { ...(reconciled ?? {}) };
        if (data.position !== q.position) patch.position = data.position;
        // A tolerancia vem do servidor ou nao vem: o app nao a calcula, porque
        // e o servidor que cobra (D13/D15).
        const ate = data.toleranceUntil ? Date.parse(data.toleranceUntil) : null;
        if ((ate || null) !== (q.toleranceUntil ?? null)) patch.toleranceUntil = ate || null;
        const valor = typeof data.exitPenaltyValue === 'number' ? data.exitPenaltyValue : null;
        if (valor !== (q.exitPenaltyValue ?? null)) patch.exitPenaltyValue = valor;
        // Ancora do progresso: grava a posição só na PRIMEIRA leitura. Se
        // fosse reescrita a cada poll, "já passou N" seria sempre zero.
        if (q.initialPosition == null) patch.initialPosition = data.position;
        if (Object.keys(patch).length > 0) updateQueue(patch);
      } catch {}

      // 2. Status real do atendimento (fallback do WebSocket): reflete
      //    IN_PROGRESS/FINISHED na tela. Roda SEMPRE, mesmo se o wait-time falhar.
      try {
        const hist = await attendanceService.listClientHistory(accessToken);
        const mine = hist.data.find((a) => a.id === q.attendanceId);
        if (mine) {
          // O atendimento acabou sem acontecer — cancelado (CANCELLED) ou a loja
          // tirou o cliente (REMOVED): sai da fila no cliente (limpa store +
          // SecureStore) para o banner sumir. ⚠️ Sem o REMOVED aqui, o cliente
          // retirado pela loja continuaria "na fila" no aparelho para sempre.
          if (saiuSemAtendimento(mine.status)) {
            useQueueStore.getState().leaveQueue();
            return;
          }
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

  // Uma consulta JA na abertura (e quando a fila passa a ser outro atendimento).
  // Ate 26/09 a primeira so vinha depois do intervalo inteiro — ate 2 min com a
  // previsao acima de 10 min —, e quem era chamado com a previsao ainda alta
  // esperava esse tempo pelo aviso de atraso (q292 reprovou em 25/09). Chaveada
  // no `attendanceId`, e nao na fila inteira: cada consulta atualiza a fila, e
  // reconsultar a cada atualizacao viraria um laco.
  useEffect(() => {
    if (!activeQueue?.attendanceId) return;
    const primeira = setTimeout(() => pollRef.current(), 0);
    return () => clearTimeout(primeira);
  }, [activeQueue?.attendanceId]);

  const refresh = useCallback(() => pollRef.current(), []);

  const color = activeQueue ? URGENCY_COLORS[urgency] : URGENCY_COLORS.normal;

  return {
    /** Minutos ate a vez; `null` = o servidor ainda nao disse. */
    remaining,
    /** Atalho para as telas: nao ha previsao para mostrar (nao e "agora"). */
    semPrevisao: remaining == null,
    elapsedSeconds,
    urgency,
    color,
    isInQueue: !!activeQueue && activeQueue.status === 'SCHEDULED',
    /** Chamado e nao chegou (LATE). Segue na fila: o profissional ainda espera
        o corte comecar — as telas mostram a fila, e nao "nenhum atendimento". */
    isLate: !!activeQueue && activeQueue.status === 'LATE',
    isBeingAttended: !!activeQueue && activeQueue.status === 'IN_PROGRESS',
    isPaused: !!activeQueue && activeQueue.status === 'PAUSED',
    isFinished: !!activeQueue && activeQueue.status === 'FINISHED',
    activeQueue,
    refresh,
  };
}
