import { useEffect } from 'react';

import { ofertasNovas } from '@domain/queue/conviteDeTroca';
import { useSwapOffers } from '@hooks/useSwapOffers';
import { useConviteDeTrocaStore } from '@stores/conviteDeTrocaStore';
import { useQueueStore } from '@stores/queueStore';

/**
 * Vigia as ofertas de troca que o cliente PODE aceitar e mostra a nova como
 * popup (D16). Vive no App — antes elas so eram buscadas com a tela da fila
 * aberta. So roda com o cliente aguardando: e o unico estado em que a troca
 * vale.
 */
export function useConviteDeTroca() {
  const activeQueue = useQueueStore((s) => s.activeQueue);
  const aguardando = !!activeQueue?.attendanceId && activeQueue.status === 'SCHEDULED';
  const { data: ofertas } = useSwapOffers(activeQueue?.professionalId, aguardando);
  const jaMostradas = useConviteDeTrocaStore((s) => s.jaMostradas);
  const mostrar = useConviteDeTrocaStore((s) => s.mostrar);

  useEffect(() => {
    if (!aguardando || !ofertas?.length) return;
    const [nova] = ofertasNovas(ofertas, jaMostradas);
    if (nova) mostrar(nova);
  }, [aguardando, ofertas, jaMostradas, mostrar]);
}
