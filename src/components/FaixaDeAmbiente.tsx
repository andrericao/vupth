import { Text, View } from "react-native";
import * as Updates from "expo-updates";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTema } from "@hooks/useTema";
import { resolveApiEnv } from "@services/apiEnv";

/** So o ambiente `prod` (canal `production`) fica sem faixa; qualquer outro e teste. */
export function ehAmbienteDeTeste(canal: string | null | undefined, envDoPacote?: string): boolean {
  return resolveApiEnv(canal ?? null, envDoPacote) !== "prod";
}

function canalDoBundle(): string | null {
  try {
    return Updates.channel ?? null;
  } catch {
    return null;
  }
}

// faixa-de-ambiente (CLI, fraquezas F20, igual a do Partner): nos builds de teste uma faixa fina avisa que e
// ambiente de teste, para ninguem confundir com a producao. Na producao nao aparece. Fica por cima, logo abaixo
// da barra de status, sem empurrar nenhuma tela e sem pegar o toque. Cores do tema, nada de hex.
export function FaixaDeAmbiente() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  if (!ehAmbienteDeTeste(canalDoBundle(), process.env.EXPO_PUBLIC_API_ENV)) return null;
  return (
    <View
      testID="faixa-de-ambiente"
      accessibilityLabel="Ambiente de teste"
      pointerEvents="none"
      style={{
        position: "absolute",
        top: insets.top,
        left: 0,
        right: 0,
        paddingVertical: 1,
        backgroundColor: cores.surface,
        zIndex: 9997,
        elevation: 9997,
      }}
    >
      <Text style={{ color: cores.textSecondary, fontSize: 10, textAlign: "center" }}>AMBIENTE DE TESTE</Text>
    </View>
  );
}
