import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";

import { aindaDaParaPedir } from "@domain/push";

// ligar-push-permission (Andre, 05/10): a tela 10 (PushPermission) vem antes da
// caixa do sistema, na primeira entrada numa fila. Fora do usePushRegistration
// para a tela da fila nao carregar o hook inteiro.

// A caixa de permissão do sistema já apareceu neste aparelho: não volta.
export const PUSH_PERGUNTADO_KEY = "vupth_push_perguntado";

/**
 * "Prefiro acompanhar pelo app" na tela 10 (ligar-push-permission): a caixa do
 * sistema nao vem — conta como ja perguntado, como quem negou na caixa.
 */
export async function recusarAvisoDePush(): Promise<void> {
  try {
    await SecureStore.setItemAsync(PUSH_PERGUNTADO_KEY, "1");
  } catch {}
}

/**
 * A tela 10 tem o que explicar? So no aparelho, com a permissao ainda em
 * aberto e a caixa do sistema nunca mostrada. Quem ja respondeu (ou instalou
 * antes, quando a caixa vinha no login) nao a ve.
 */
export async function podeOferecerPush(): Promise<boolean> {
  if (Platform.OS === "web" || !Device.isDevice) return false;
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (!aindaDaParaPedir({ status, canAskAgain })) return false;
    return (await SecureStore.getItemAsync(PUSH_PERGUNTADO_KEY)) !== "1";
  } catch {
    return false;
  }
}
