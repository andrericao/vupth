import { useQuery } from '@tanstack/react-query';

import { establishmentService } from '@services/establishmentService';
import { mostraPosicao } from '@domain/queue/posicao';

/**
 * Se a posição de quem está na fila deste profissional pode aparecer (ver
 * `@domain/queue/posicao`). Lê a mesma lista da loja que a tela da loja e o WS
 * mantêm — quando ela já está no cache, não sai request nenhum. Sem polling
 * próprio: o interruptor muda raramente, e o staging não aguenta chamada à toa.
 */
export function useMostraPosicao(establishmentId: string | undefined, professionalId: string | undefined) {
  const { data } = useQuery({
    queryKey: ['professionals-with-queue', establishmentId],
    queryFn: () =>
      establishmentService
        .getProfessionalsWithQueue(establishmentId!)
        .then((res) => res.data.professionals ?? []),
    enabled: !!establishmentId && !!professionalId,
    staleTime: 60000,
  });
  return mostraPosicao(data, professionalId);
}
