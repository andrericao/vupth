import { alertaTipado } from "@utils/alertaTipado";

import { attendanceService } from "@services/attendanceService";
import { useAuthStore } from "@stores/authStore";

// Adiantado por desistencia (Backend d959214, em producao): alguem saiu da fila
// e a vez do cliente adiantou. Ele topa o horario novo ou nao — sem topar, segue
// protegido pelo horario prometido na entrada (o atraso so conta dele).
// Chega pelo WebSocket pessoal e pelo push; os dois caminhos usam esta pergunta.
//
// Com o app aberto chegam os DOIS (WS e push) — a mesma oferta pergunta uma vez.
let ultima: { chave: string; em: number } | null = null;
const JANELA_MS = 60_000;

export function oferecerVezAdiantada(attendanceId: string, mensagem: string, agora: number = Date.now()): void {
  const chave = `${attendanceId}|${mensagem}`;
  if (ultima && ultima.chave === chave && agora - ultima.em < JANELA_MS) return;
  ultima = { chave, em: agora };
  alertaTipado("Sua vez adiantou", mensagem, [
    { text: "Não, mantenho meu horário", style: "cancel" },
    {
      text: "Topo",
      onPress: async () => {
        const token = useAuthStore.getState().accessToken;
        if (!token) return;
        try {
          await attendanceService.acceptEarlierTurn(attendanceId, token);
          alertaTipado("Combinado", "Seu horário passou a ser o novo. O atraso conta a partir dele.", undefined, { tipo: "informacao" });
        } catch {
          alertaTipado(
            "Não foi possível confirmar",
            "A vaga pode ter mudado de novo. Você segue com o seu horário de antes.",
            undefined,
            { tipo: "erro" },
          );
        }
      },
    },
  ], { tipo: "atencao" });
}
