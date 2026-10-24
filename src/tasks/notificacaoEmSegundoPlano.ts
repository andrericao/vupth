import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

import { responderPeloPush } from "@utils/trocaPeloPush";

// push-resolve-sem-abrir-o-app (24/10, o André instalou o expo-task-manager): Trocar, Aceitar e
// Recusar do push respondem SEM abrir o app. No Android, o toque no botao com `opensAppToForeground:
// false` roda esta tarefa mesmo com o app fechado (o JS sobe em segundo plano); no iOS o botao so chega
// ao JS com o app vivo. Define e registra no escopo do modulo, importado cedo pelo App.
export const TAREFA_DE_NOTIFICACAO = "VUPTH-NOTIFICACAO-EM-SEGUNDO-PLANO";

type Resposta = { actionIdentifier: string; notification: { request: { identifier: string; content: { data?: unknown } } } };

const ehResposta = (p: unknown): p is Resposta =>
  !!p &&
  typeof (p as Resposta).actionIdentifier === "string" &&
  typeof (p as Resposta).notification?.request?.identifier === "string";

/** O payload da tarefa: so a resposta a um botao interessa; a notificacao recebida nao faz nada. */
export async function tratarPayloadDaTarefa(payload: unknown): Promise<void> {
  if (!ehResposta(payload)) return;
  const { actionIdentifier, notification } = payload;
  await responderPeloPush(notification.request.identifier, actionIdentifier, notification.request.content.data, true);
}

try {
  TaskManager.defineTask(TAREFA_DE_NOTIFICACAO, async ({ data, error }) => {
    if (error) return;
    await tratarPayloadDaTarefa(data);
  });
  Notifications.registerTaskAsync(TAREFA_DE_NOTIFICACAO).catch(() => {});
} catch {
  // binario sem o modulo nativo: sem tarefa em segundo plano (as acoes abrem o app, como antes).
}
