import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { attendanceService } from '@services/attendanceService';
import { desfechoDoPedido } from '@domain/queue/pedidoDeCorte';
import { filaDoAtendimento } from '@domain/queue/reconciliar';
import { useAuthStore } from '@stores/authStore';
import { useQueueStore } from '@stores/queueStore';
import { usePedidoDeCorteStore } from '@stores/pedidoDeCorteStore';

/**
 * Vigia os pedidos de corte que esperam resposta e AVISA o desfecho — aceito
 * (e ja poe o cliente na fila) ou sem aceite no prazo. Ver `pedidoDeCorte.ts`
 * para o porque: nenhum dos dois canais de aviso chegava a quem so pediu corte.
 *
 * So roda com pedido guardado: sem pedido, nenhum request. Vive no App (dentro
 * do QueryClientProvider), porque a resposta chega com a pessoa em qualquer tela.
 */
export function usePedidoDeCorte() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const pedidos = usePedidoDeCorteStore((s) => s.pedidos);
  const remover = usePedidoDeCorteStore((s) => s.remover);
  const resolvendo = useRef(false);

  const { data: historico } = useQuery({
    queryKey: ['pedido-de-corte-historico'],
    queryFn: () => attendanceService.listClientHistory(accessToken!).then((r) => r.data),
    enabled: !!accessToken && pedidos.length > 0,
    // 15 s: o pedido vale 5 min, e o cliente esta decidindo se sai de casa.
    refetchInterval: 15000,
    staleTime: 0,
  });

  const resolver = useCallback(async () => {
    if (!historico || resolvendo.current) return;
    resolvendo.current = true;
    try {
      for (const pedido of pedidos) {
        const desfecho = desfechoDoPedido(pedido, historico, Date.now());
        if (desfecho.tipo === 'aguardando') continue;

        await remover(pedido.id);

        if (desfecho.tipo === 'aceito') {
          // Ja ha fila no aparelho (entrou por outro caminho): so avisa.
          if (!useQueueStore.getState().activeQueue) {
            const fila = filaDoAtendimento(desfecho.atendimento, pedido.establishmentName);
            await useQueueStore.getState().joinQueue({
              ...fila,
              professionalName: fila.professionalName || pedido.professionalName,
            });
          }
          Alert.alert(
            'Pedido aceito',
            `${pedido.professionalName || 'O profissional'} aceitou o seu pedido. Você já está na fila — acompanhe o seu tempo no Início.`,
          );
        } else {
          Alert.alert(
            'Pedido não aceito',
            `${pedido.professionalName || 'O profissional'} não aceitou o pedido a tempo: recusou ou não respondeu em 5 minutos. Você pode escolher outro profissional ou agendar.`,
          );
        }
      }
    } finally {
      resolvendo.current = false;
    }
  }, [historico, pedidos, remover]);

  useEffect(() => {
    resolver();
  }, [resolver]);
}
