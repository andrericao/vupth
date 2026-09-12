import { useEffect, useRef } from "react";

import { atendimentoAtivo, filaDoAtendimento } from "@domain/queue/reconciliar";
import { attendanceService } from "@services/attendanceService";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";

// Se o SERVIDOR diz que ha atendimento ativo e o aparelho nao sabe, quem esta
// errado e o aparelho.
//
// Roda uma vez por sessao autenticada, depois do `restoreQueue` ter lido o
// disco. Sem isto, o cliente que entrou por ACEITE DE PEDIDO DE CORTE nunca ve
// a propria fila: o estado local nasce so quando ele mesmo entra pela tela, e
// esse caminho nao passou por la.
//
// ⚠️ So preenche quando o local esta VAZIO. Nunca sobrescreve uma fila que o
// aparelho ja tem: o estado local carrega coisas que o historico nao sabe
// (`initialPosition`, a ancora do progresso), e sobrescrever apagaria o
// "voce ja passou N pessoas" a cada abertura.
export function useReconciliarFila() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const jaTentou = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || jaTentou.current) return;
    let cancelado = false;

    (async () => {
      try {
        // O local manda: se ja ha fila aqui, nao ha o que reconstruir.
        if (useQueueStore.getState().activeQueue) {
          jaTentou.current = true;
          return;
        }
        const { data } = await attendanceService.listClientHistory(accessToken);
        if (cancelado) return;

        const ativo = atendimentoAtivo(data ?? []);
        // Relê o estado: a busca leva tempo, e nesse intervalo o cliente pode
        // ter entrado numa fila pela tela. O que ele acabou de fazer ganha.
        if (ativo && !useQueueStore.getState().activeQueue) {
          await useQueueStore.getState().joinQueue(filaDoAtendimento(ativo));
        }
        jaTentou.current = true;
      } catch {
        // Best-effort: sem rede, o app segue com o que tem no disco. Nao
        // marca `jaTentou` — a proxima sessao tenta de novo.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [isAuthenticated, accessToken]);

  // Sessao nova pode ser outro usuario: permite reconciliar de novo.
  useEffect(() => {
    if (!isAuthenticated) jaTentou.current = false;
  }, [isAuthenticated]);
}
