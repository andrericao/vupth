import { useEffect, useState } from "react";
import { Animated, AccessibilityInfo, Easing } from "react-native";
import { useTema } from "@hooks/useTema";

type Props = {
  size?: number;
  /** Cor do ponto. Hex cru: Animated.View nao resolve token do gluestack. */
  color?: string;
  /**
   * Pulsa? Default `true`.
   *
   * ⚠️ Passe `false` quando o estado NAO for ao vivo. A mesma pilula serve
   * "Livre" (aberto agora) e "Agendar" (loja fechada); no partner serve
   * "ATENDENDO AGORA" e "PAUSADO". Ponto piscando sinaliza atividade
   * acontecendo — num estado parado, isso e mentira visual.
   */
  pulsing?: boolean;
};

/**
 * Ponto de status que PISCA quando o estado e ao vivo.
 *
 * Pulso de opacidade (1 -> 0.3 -> 1) em ~1,4s, `useNativeDriver` — nao passa
 * por JS a cada frame. Respeita reduce-motion: com a preferencia ligada o
 * ponto fica FIXO e opaco, sem animacao nenhuma. Piscar e exatamente o tipo de
 * movimento que essa preferencia existe pra desligar, e o estado continua
 * legivel sem ele (a cor e o rotulo ja dizem tudo).
 */
export function LiveDot({ size = 8, color, pulsing = true }: Props) {
  const { cores } = useTema();
  const [opacity] = useState(() => new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    if (!pulsing || reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing, reduceMotion, opacity]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color ?? cores.textPrimary,
        opacity,
      }}
    />
  );
}
