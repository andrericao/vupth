import { useCallback, useRef } from "react";
import { BackHandler, Platform, ToastAndroid } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const DEFAULT_WINDOW_MS = 2000;
const DEFAULT_MESSAGE = "Pressione voltar novamente para sair";

/**
 * Decide se o segundo "voltar" deve sair do app: true quando houve um voltar
 * anterior dentro da janela de tempo. Função pura (testável).
 */
export function shouldExitOnBack(
  lastPressAt: number | null,
  now: number,
  windowMs: number = DEFAULT_WINDOW_MS,
): boolean {
  return lastPressAt !== null && now - lastPressAt <= windowMs;
}

/**
 * "Pressione voltar novamente para sair" na tela raiz (Home). Sem isso, um único
 * back do Android na raiz fecha/minimiza o app abruptamente. Só ativa enquanto a
 * tela está focada e apenas no Android (iOS não tem back de hardware).
 */
export function useDoubleBackExit(message: string = DEFAULT_MESSAGE) {
  const lastPress = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;

      const onBack = () => {
        const now = Date.now();
        if (shouldExitOnBack(lastPress.current, now)) {
          return false; // deixa o sistema sair do app
        }
        lastPress.current = now;
        ToastAndroid.show(message, ToastAndroid.SHORT);
        return true; // bloqueia o exit nesse primeiro toque
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [message]),
  );
}
