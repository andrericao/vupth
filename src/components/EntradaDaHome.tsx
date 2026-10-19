import { ReactNode, useEffect, useState } from "react";
import { Animated } from "react-native";
import { EASE, movimentoReduzido } from "@utils/motion";

// A Home entra pela direita enquanto o V da abertura sai pela esquerda: o
// movimento é um só, em duas peças, e liga as duas telas. Sem isto a Home
// aparecia de uma vez por cima do V, e a saída virava só um corte.
const DESLOCAMENTO = 32;
const DURACAO = 600;

export function EntradaDaHome({ children }: { children: ReactNode }) {
  const [entrada] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let vivo = true;
    movimentoReduzido().then((reduzido) => {
      if (!vivo) return;
      if (reduzido) {
        entrada.setValue(1);
        return;
      }
      Animated.timing(entrada, { toValue: 1, duration: DURACAO, easing: EASE.entrada, useNativeDriver: true }).start();
    });
    return () => {
      vivo = false;
    };
  }, [entrada]);
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: entrada,
        transform: [{ translateX: entrada.interpolate({ inputRange: [0, 1], outputRange: [DESLOCAMENTO, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
