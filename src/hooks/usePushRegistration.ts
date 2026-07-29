import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

import {
  acquireExpoPushToken,
  mapPlatform,
  notificationRoute,
} from "@domain/push";
import { pushService } from "@services/pushService";
import { navigateFromNotification } from "@routes/navigationRef";
import { useAuthStore } from "@stores/authStore";

// Chave onde o Expo Push Token registrado é guardado, p/ o logout desregistrar
// (authStore.logout → DELETE /devices). Mesmo valor do authStore.
const PUSH_TOKEN_KEY = "vupth_push_token";

// Push em foreground: banner/lista/som (o WS já cobre a UI in-app; o banner
// reforça). Registrado uma vez no módulo.
//
// ⚠️ RESILIÊNCIA OTA: este arquivo pode carregar num binário SEM o módulo nativo
// (ex.: OTA novo — que já tem este código — rodando sobre um APK antigo, buildado
// antes do expo-notifications). Sem guarda, a chamada nativa lança no eval do
// módulo e o app inteiro cai (rollback pro bundle embutido velho). O try/catch
// deixa o resto do app (JS) rodar; push só funciona num build COM o módulo.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // binário sem o módulo nativo de push — segue sem handler.
}

/**
 * Registra o device para push quando o cliente está autenticado (POST /devices)
 * e trata o toque na notificação. Best-effort: nenhuma falha de push quebra o app.
 */
export function usePushRegistration() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const didRegister = useRef(false);

  // Android exige um canal para exibir notificações.
  useEffect(() => {
    if (Platform.OS === "android") {
      try {
        Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.DEFAULT,
        }).catch(() => {});
      } catch {
        // binário sem o módulo nativo de push.
      }
    }
  }, []);

  // Aquisição de token + POST /devices (uma vez por sessão autenticada).
  useEffect(() => {
    if (!isAuthenticated || !accessToken || didRegister.current) return;
    let cancelled = false;

    (async () => {
      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

        const token = await acquireExpoPushToken({
          isDevice: Device.isDevice,
          getPermissionsAsync: Notifications.getPermissionsAsync,
          requestPermissionsAsync: Notifications.requestPermissionsAsync,
          getExpoPushTokenAsync: Notifications.getExpoPushTokenAsync,
          projectId,
        });
        if (!token || cancelled) return;

        await pushService.registerDevice(token, mapPlatform(Platform.OS), accessToken);
        await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
        didRegister.current = true;
      } catch {
        // best-effort — push nunca deve derrubar o fluxo de login.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, accessToken]);

  // Ao deslogar, permitir novo registro na próxima sessão.
  useEffect(() => {
    if (!isAuthenticated) didRegister.current = false;
  }, [isAuthenticated]);

  // Toque na notificação → navega conforme o data.type.
  useEffect(() => {
    try {
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        navigateFromNotification(notificationRoute(data));
      });
      return () => sub.remove();
    } catch {
      // binário sem o módulo nativo de push — sem listener de toque.
    }
  }, []);
}
