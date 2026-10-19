import { ReactNode } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { useEntrada } from "@utils/motion";

// Invólucro de entrada suave: o que acabou de chegar (um cliente na fila, uma
// faixa) aparece com fade e deslize em vez de pular na tela. Para elementos de
// posição absoluta use o hook `useEntrada` direto, que não troca a estrutura.
export function EntradaSuave({
  children,
  dy,
  atraso,
  style,
}: {
  children: ReactNode;
  dy?: number;
  /** Milissegundos de atraso, para escalonar uma lista. */
  atraso?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const entrada = useEntrada({ dy, atraso });
  return <Animated.View style={[style, entrada]}>{children}</Animated.View>;
}
