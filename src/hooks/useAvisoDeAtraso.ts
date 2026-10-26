import { useEffect } from "react";
import { alertaTipado } from "@utils/alertaTipado";

import { avisoDeAtraso, precisaAvisarAtraso } from "@domain/queue/ciencia";
import { useCienciaStore } from "@stores/cienciaStore";
import { useQueueStore } from "@stores/queueStore";
import { abrirMudarMinhaVez } from "@routes/navigationRef";

/**
 * O cliente foi chamado e nao chegou: avisa, e espera o toque.
 *
 * "Nao podemos agir na surdina" (Andre, 18/09). O atraso avisa MESMO SEM MULTA,
 * porque e a contagem que torna a terceira vez justa — quem chega na 3a sem
 * nunca ter sido avisado e punido por uma regra que nao viu.
 *
 * Vive no App, e nao na tela da fila, porque o atraso acontece justamente
 * quando a pessoa NAO esta olhando o app: o status chega pelo poll do
 * `useQueueCountdown` (ou pela reconciliacao) em qualquer tela.
 *
 * A CONTAGEM ("este e o seu 1o/2o atraso") vem do `lateCount` do wait-time
 * (Backend e328629). Sem ela, o aviso diz o que sabe e nao inventa ordinal. O 3o
 * atraso manda o cliente para o fim da fila (status volta a SCHEDULED) — esse
 * chega pelo push LATE_MARKED do servidor, com o texto dele.
 */
export function useAvisoDeAtraso() {
  const activeQueue = useQueueStore((s) => s.activeQueue);
  const jaAvisados = useCienciaStore((s) => s.ids);
  const registrarCiencia = useCienciaStore((s) => s.registrarCiencia);

  useEffect(() => {
    const attendanceId = activeQueue?.attendanceId ?? null;
    if (!precisaAvisarAtraso({ status: activeQueue?.status, attendanceId, jaAvisados })) return;

    const aviso = avisoDeAtraso({ contagem: activeQueue?.lateCount });
    // Lida na hora do toque: a fila mais recente, sem fazer o aviso reabrir a cada poll.
    const fila = () => useQueueStore.getState().activeQueue;
    alertaTipado(aviso.titulo, aviso.mensagem, [
      // Adiar tambem registra a ciencia: o toque, qualquer um, e o "eu soube".
      ...(aviso.oferecerAdiar
        ? [{
            text: "Adiar",
            onPress: () => {
              registrarCiencia(attendanceId!);
              const f = fila();
              if (f) abrirMudarMinhaVez(f);
            },
          }]
        : []),
      // O toque E o registro. Sem `cancelable`, tambem nao da pra sair por fora
      // no Android — clicar ao lado nao pode valer por "eu soube".
      { text: aviso.botao, onPress: () => registrarCiencia(attendanceId!) },
    // modais-de-alerta (CLI-24): o 3o atraso gera multa (dinheiro, selo Multa); antes dele e atencao.
    ], aviso.oferecerAdiar ? { cancelable: false, tipo: "atencao" } : { cancelable: false, tipo: "dinheiro", selo: "Multa" });
  }, [activeQueue?.attendanceId, activeQueue?.status, activeQueue?.lateCount, jaAvisados, registrarCiencia]);
}
