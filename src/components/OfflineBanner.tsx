import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIsOnline } from "@hooks/useNetwork";
import { fs } from "@stores/fonteStore";

// Barra fixa no topo quando o device esta sem conexao. O countdown da fila segue
// rodando local (pelo relogio), mas o resto pode estar desatualizado — este
// aviso deixa isso claro. Some sozinho ao reconectar (o React Query re-sincroniza).
export function OfflineBanner() {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top + 4,
        paddingBottom: 6,
        paddingHorizontal: 12,
        backgroundColor: "#B3261E",
        alignItems: "center",
        zIndex: 9999,
        elevation: 9999,
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: fs(12), fontWeight: "600" }}>
        Sem conexão — os dados podem estar desatualizados
      </Text>
    </View>
  );
}
