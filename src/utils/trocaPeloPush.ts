import { Alert } from "react-native";
import * as Notifications from "expo-notifications";

import {
  ACAO_RECUSAR,
  ACOES_QUE_ACEITAM,
  aceiteDaTroca,
  avisoDeMenosDeUmaHora,
  precisaConfirmarMenosDeUmaHora,
  recusaDaTroca,
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

// push-resolve-sem-abrir-o-app (24/10): com o app fechado nao ha tela para o Alert; o aviso de
// falha vira uma notificacao local, e a pergunta de "menos de 1 hora" manda abrir o app.
async function notificarLocal(titulo: string, corpo: string) {
  try {
    await Notifications.scheduleNotificationAsync({ content: { title: titulo, body: corpo }, trigger: null });
  } catch {
    // sem o modulo nativo de push: nada a mostrar.
  }
}

const AVISO_FALHA_TROCA = { titulo: "Não foi possível trocar", corpo: "A troca não está mais disponível. Sua vez continua a mesma." };
const falhou = (segundoPlano: boolean) =>
  segundoPlano ? notificarLocal(AVISO_FALHA_TROCA.titulo, AVISO_FALHA_TROCA.corpo) : Alert.alert(AVISO_FALHA_TROCA.titulo, AVISO_FALHA_TROCA.corpo);
const deuCerto = (segundoPlano: boolean) => {
  // Em segundo plano o proprio Backend manda o push "A troca foi feita" (so OK).
  if (!segundoPlano) Alert.alert("Troca confirmada", "Sua vez mudou. Confira na fila.");
};

export async function confirmarTrocaPeloPush(data: unknown, segundoPlano = false): Promise<void> {
  const aceite = aceiteDaTroca(data);
  const token = useAuthStore.getState().accessToken;
  if (!aceite || !token) return;
  try {
    await enviar(aceite, token, false);
    deuCerto(segundoPlano);
  } catch (erro) {
    if (!precisaConfirmarMenosDeUmaHora(erro)) {
      await falhou(segundoPlano);
      return;
    }
    const aviso = avisoDeMenosDeUmaHora(data);
    if (segundoPlano) {
      await notificarLocal(aviso.titulo, `${aviso.mensagem} Abra o app para confirmar a troca.`);
      return;
    }
    Alert.alert(aviso.titulo, aviso.mensagem, [
      { text: "AGORA NÃO", style: "cancel" },
      {
        text: "CONFIRMAR",
        onPress: async () => {
          try {
            await enviar(aceite, token, true);
            deuCerto(false);
          } catch {
            await falhou(false);
          }
        },
      },
    ]);
  }
}

// O RECUSAR da notificacao do pedido de troca (push-acoes-por-pergunta): nega o pedido dali mesmo.
export async function recusarTrocaPeloPush(data: unknown, segundoPlano = false): Promise<void> {
  const id = recusaDaTroca(data);
  const token = useAuthStore.getState().accessToken;
  if (!id || !token) return;
  try {
    await swapOfferService.refuseRequest(id, token);
  } catch {
    const corpo = "O pedido não está mais disponível.";
    if (segundoPlano) await notificarLocal("Não foi possível recusar", corpo);
    else Alert.alert("Não foi possível recusar", corpo);
  }
}

// A mesma notificacao pode chegar duas vezes ao JS (no Android a tarefa em segundo plano e o ouvinte
// de resposta disparam juntos quando o app esta vivo): responde uma vez so.
const respondidas = new Set<string>();

/**
 * Trocar, Aceitar e Recusar do push (push-acoes-por-pergunta, push-resolve-sem-abrir-o-app): chamam a
 * API sem abrir o app. Em segundo plano o JS sobe sem sessao: restaura antes. Devolve `false` quando o
 * botao nao e de resposta (quem chama segue o caminho de sempre).
 */
export async function responderPeloPush(
  idDaNotificacao: string,
  acao: string,
  data: unknown,
  segundoPlano = false,
): Promise<boolean> {
  const aceita = ACOES_QUE_ACEITAM.includes(acao);
  if (!aceita && acao !== ACAO_RECUSAR) return false;
  if (respondidas.has(idDaNotificacao)) return true;
  respondidas.add(idDaNotificacao);
  if (segundoPlano && !useAuthStore.getState().accessToken) await useAuthStore.getState().restoreSession();
  if (aceita) await confirmarTrocaPeloPush(data, segundoPlano);
  else await recusarTrocaPeloPush(data, segundoPlano);
  return true;
}
