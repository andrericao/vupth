import { useContext, useState } from "react";
import { Pressable, Text } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { useTema } from "@hooks/useTema";
import { fs } from "@stores/fonteStore";
import { useModoSeguroStore } from "@stores/modoSeguroStore";

// log-de-falha-na-abertura (DEC-152): o app caiu duas vezes seguidas na abertura e subiu em modo seguro (sem o cache
// salvo e sem o push em segundo plano). Avisa em uma linha, uma vez, e some ao tocar. Nunca esconde login nem dados.
export function AvisoModoSeguro() {
  const seguro = useModoSeguroStore((s) => s.lido && s.seguro);
  const [fechado, setFechado] = useState(false);
  // Sem o provider (ex.: o aviso fora da arvore de insets) o contexto vem nulo: usa 0 em vez de lancar. Um aviso de
  // seguranca nao pode ser, ele mesmo, o que derruba a abertura.
  const insets = useContext(SafeAreaInsetsContext) ?? { bottom: 0 };
  const { cores } = useTema();
  if (!seguro || fechado) return null;
  return (
    <Pressable
      onPress={() => setFechado(true)}
      testID="aviso-modo-seguro"
      accessibilityRole="alert"
      accessibilityLabel="O app abriu em modo seguro. Toque para fechar o aviso."
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: insets.bottom + 8,
        paddingTop: 8,
        paddingHorizontal: 16,
        backgroundColor: cores.greenTint,
        alignItems: "center",
        zIndex: 9997,
        elevation: 9997,
      }}
    >
      <Text style={{ color: cores.onGreenTint, fontSize: fs(12), fontWeight: "600", textAlign: "center" }}>
        Abrimos em modo seguro: o app fechou duas vezes ao abrir. Alguns recursos voltam na próxima abertura.
      </Text>
    </Pressable>
  );
}
