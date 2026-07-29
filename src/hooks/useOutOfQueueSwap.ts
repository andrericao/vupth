import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { swapOfferService } from '@services/swapOfferService';
import { attendanceService } from '@services/attendanceService';
import { vanishedPendingOffers, findSwapAttendance } from '@domain/queue/swap';
import { useAuthStore } from '@stores/authStore';
import { useQueueStore } from '@stores/queueStore';
import { usePendingSwapStore } from '@stores/pendingSwapStore';

/**
 * Vigia as ofertas publicadas de FORA da fila (F8 fatia 2). Quem está fora não
 * tem WebSocket de fila conectado, então o aceite chega por POLL: a oferta some
 * do `GET /swap-offers/me` (que só lista OPEN) e o atendimento nasce na vaga
 * cedida. Ao detectar, entra na fila local com o contexto guardado na publicação
 * e avisa o cliente. Sumiu sem atendimento = cancelada/expirada: só limpa.
 *
 * Só roda quando há pedido pendente guardado — sem pedido, nenhum request.
 */
export function useOutOfQueueSwap() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const pending = usePendingSwapStore((s) => s.offers);
  const removePending = usePendingSwapStore((s) => s.removePending);
  const activeQueue = useQueueStore((s) => s.activeQueue);
  const joinQueue = useQueueStore((s) => s.joinQueue);
  const resolvingRef = useRef(false);

  const enabled = !!accessToken && pending.length > 0;

  const { data: openOffers, refetch } = useQuery({
    queryKey: ['swap-offers-mine'],
    queryFn: () => swapOfferService.listMine(accessToken!).then((r) => r.data),
    enabled,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const resolve = useCallback(async () => {
    if (!accessToken || !openOffers || resolvingRef.current) return;
    const vanished = vanishedPendingOffers(pending, openOffers);
    if (vanished.length === 0) return;

    resolvingRef.current = true;
    try {
      // Uma leitura do histórico serve para todos os sumiços do ciclo.
      let history: Awaited<ReturnType<typeof attendanceService.listClientHistory>>['data'] = [];
      try {
        history = (await attendanceService.listClientHistory(accessToken)).data;
      } catch {
        return; // sem histórico não dá para distinguir aceite: tenta no próximo poll
      }

      for (const ctx of vanished) {
        const attendance = findSwapAttendance(history, ctx.professionalId);
        await removePending(ctx.offerId);

        // Já estar numa fila (ou nenhum atendimento novo) = cancelada/expirada.
        if (!attendance || useQueueStore.getState().activeQueue) continue;

        await joinQueue({
          attendanceId: attendance.id,
          professionalId: ctx.professionalId,
          professionalName: ctx.professionalName,
          establishmentId: ctx.establishmentId,
          establishmentName: ctx.establishmentName,
          enteredAt: Date.now(),
          estimatedMinutes: ctx.estimatedWaitMinutes,
          status: 'SCHEDULED',
        });
        Alert.alert(
          'Troca aceita! 🔄',
          `Alguém cedeu o lugar na fila de ${ctx.professionalName}. Você já está na fila — acompanhe o seu tempo em Atendimentos.`,
        );
      }
    } finally {
      resolvingRef.current = false;
    }
  }, [accessToken, openOffers, pending, removePending, joinQueue]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  return { pending, activeQueue, refetchMyOffers: refetch };
}
