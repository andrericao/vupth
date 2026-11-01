import { useEffect, useState } from "react";
import { Animated } from "react-native";
import { Text } from "@gluestack-ui/themed";

import { fs } from "@stores/fonteStore";
import { EASE, MS, useMovimentoReduzido } from "@utils/motion";

// aguardando-cronometro-e-vez (DEC-149): no 0:00 o rótulo "tempo estimado" dá lugar a "Sua vez chegou!", em negrito,
// pulsando leve como o V da abertura do app. Com "reduzir movimento" ligado fica parado.
export function SuaVezChegou({ cor }: { cor: string }) {
  const reduzido = useMovimentoReduzido();
  const [pulso] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduzido) {
      pulso.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: MS.pulso, easing: EASE.varredura, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: MS.pulso, easing: EASE.varredura, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [reduzido, pulso]);
  const opacity = pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });
  const scale = pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }} testID="sua-vez-chegou">
      <Text fontFamily="$display" fontWeight="$bold" fontSize={fs(20)} letterSpacing={-0.5} color={cor} textAlign="center">
        Sua vez chegou!
      </Text>
    </Animated.View>
  );
}
