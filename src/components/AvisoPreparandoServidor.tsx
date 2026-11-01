import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTema } from "@hooks/useTema";
import { useProntidaoStore } from "@services/prontidaoDoServidor";
import { fs } from "@stores/fonteStore";

// abrir-com-lista-salva (DEC-148): com o app aberto pela lista salva e o servidor ainda acordando, quem toca
// numa acao que grava ve este aviso curto, em vez de um erro. Some quando o servidor responde.
export function AvisoPreparandoServidor() {
  const esperando = useProntidaoStore((s) => s.esperando);
  const insets = useSafeAreaInsets();
  const { cores } = useTema();
  if (esperando <= 0) return null;
  return (
    <View
      testID="aviso-preparando-servidor"
      accessibilityRole="alert"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top + 4,
        paddingBottom: 6,
        paddingHorizontal: 12,
        backgroundColor: cores.greenTint,
        alignItems: "center",
        zIndex: 9998,
        elevation: 9998,
      }}
    >
      <Text style={{ color: cores.onGreenTint, fontSize: fs(12), fontWeight: "600" }}>Preparando o servidor…</Text>
    </View>
  );
}
