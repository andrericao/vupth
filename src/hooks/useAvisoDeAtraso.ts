import { useEffect } from "react";
import { Alert } from "react-native";

import { avisoDeAtraso, precisaAvisarAtraso } from "@domain/queue/ciencia";
import { useCienciaStore } from "@stores/cienciaStore";
import { useQueueStore } from "@stores/queueStore";

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
    Alert.alert(aviso.titulo, aviso.mensagem, [
      // O toque E o registro. Sem `cancelable`, tambem nao da pra sair por fora
      // no Android — clicar ao lado nao pode valer por "eu soube".
      { text: aviso.botao, onPress: () => registrarCiencia(attendanceId!) },
    ], { cancelable: false });
  }, [activeQueue?.attendanceId, activeQueue?.status, activeQueue?.lateCount, jaAvisados, registrarCiencia]);
}
