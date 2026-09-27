import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, Text } from "react-native";
import { ArrowUp } from "lucide-react-native";

const FOREST = "#163300";
const GREEN_TINT = "#E2F6D5";

/**
 * "↑ Voltar ao topo": aparece suave no rodape, centralizada logo acima das abas,
 * depois de duas telas de rolagem, e some perto do topo. Complementa o toque na
 * aba ativa (q245). Desenho do Partner (24/09), mais leve a pedido do Andre
 * (25/09): verde-claro com forest, 32 px de altura.
 *
 * Fica sempre montada e so muda de opacidade: escondida, nao recebe toque nem
 * aparece para o leitor de tela.
 */
export function PilulaVoltarAoTopo({ visivel, onPress }: { visivel: boolean; onPress: () => void }) {
  const [progresso] = useState(() => new Animated.Value(0));
  const [reduzMovimento, setReduzMovimento] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(setReduzMovimento)
      .catch(() => {});
  }, []);

  useEffect(() => {
    Animated.timing(progresso, {
      toValue: visivel ? 1 : 0,
      // Com "reduzir movimento" ligado, so aparece — sem deslizar.
      duration: reduzMovimento ? 0 : 200,
      useNativeDriver: true,
    }).start();
  }, [visivel, reduzMovimento, progresso]);

  return (
    <Animated.View
      pointerEvents={visivel ? "box-none" : "none"}
      accessibilityElementsHidden={!visivel}
      importantForAccessibility={visivel ? "auto" : "no-hide-descendants"}
      testID="pilula-voltar-ao-topo-caixa"
      style={{
        position: "absolute",
        bottom: 12,
        alignSelf: "center",
        opacity: progresso,
        transform: [{ translateY: progresso.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={!visivel}
        accessibilityRole="button"
        accessibilityLabel="Voltar ao topo da lista"
        testID="pilula-voltar-ao-topo"
        hitSlop={8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height: 32,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: GREEN_TINT,
          shadowColor: FOREST,
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 3,
        }}
      >
        <ArrowUp size={14} color={FOREST} />
        <Text style={{ fontFamily: "Archivo_700Bold", fontSize: 13, color: FOREST }}>Voltar ao topo</Text>
      </Pressable>
    </Animated.View>
  );
}
