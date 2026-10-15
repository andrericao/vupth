import { Alert } from "react-native";

import {
  aceiteDaTroca,
  avisoDeMenosDeUmaHora,
  precisaConfirmarMenosDeUmaHora,
  type AceiteDaTroca,
} from "@domain/trocaPeloPush";
import { attendanceService } from "@services/attendanceService";
import { swapOfferService } from "@services/swapOfferService";
import { useAuthStore } from "@stores/authStore";

// O CONFIRMAR da notificacao de troca (troca-pela-notificacao). O app ja abriu
// na fila (quem chama navega); aqui so o aceite e os avisos.

function enviar(a: AceiteDaTroca, token: string, confirmar: boolean) {
  if (a.tipo === "pedido") return swapOfferService.acceptRequest(a.id, token, confirmar);
  if (a.tipo === "oferta") return swapOfferService.accept(a.id, token, confirmar);
  return attendanceService.acceptEarlierTurn(a.attendanceId, token);
}

const falhou = () =>
  Alert.alert("Não foi possível trocar", "A troca não está mais disponível. Sua vez continua a mesma.");
const deuCerto = () => Alert.alert("Troca confirmada", "Sua vez mudou. Confira na fila.");

export async function confirmarTrocaPeloPush(data: unknown): Promise<void> {
  const aceite = aceiteDaTroca(data);
  const token = useAuthStore.getState().accessToken;
  if (!aceite || !token) return;
  try {
    await enviar(aceite, token, false);
    deuCerto();
  } catch (erro) {
    if (!precisaConfirmarMenosDeUmaHora(erro)) {
      falhou();
      return;
    }
    const aviso = avisoDeMenosDeUmaHora(data);
    Alert.alert(aviso.titulo, aviso.mensagem, [
      { text: "AGORA NÃO", style: "cancel" },
      {
        text: "CONFIRMAR",
        onPress: async () => {
          try {
            await enviar(aceite, token, true);
            deuCerto();
          } catch {
            falhou();
          }
        },
      },
    ]);
  }
}
