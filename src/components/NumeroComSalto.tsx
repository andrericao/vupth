import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { EASE, movimentoReduzido } from "@utils/motion";

// O número que acabou de mudar dá um salto curto (1 a 1,1 a 1, em 0,4 s). O texto
// já é o valor novo desde o primeiro quadro: não há dígito rolando, então o leitor
// de tela e os testes leem o número certo, e a mudança deixa de passar despercebida.
// O primeiro valor não anima: salto só existe quando algo mudou.
export function NumeroComSalto({ valor, children }: { valor: string | number; children: ReactNode }) {
  const [escala] = useState(() => new Animated.Value(1));
  const anterior = useRef(valor);
  useEffect(() => {
    if (anterior.current === valor) return;
    anterior.current = valor;
    let vivo = true;
    let anim: Animated.CompositeAnimation | null = null;
    movimentoReduzido().then((reduzido) => {
      if (!vivo || reduzido) return;
      anim = Animated.sequence([
        Animated.timing(escala, { toValue: 1.1, duration: 150, easing: EASE.entrada, useNativeDriver: true }),
        Animated.timing(escala, { toValue: 1, duration: 250, easing: EASE.entrada, useNativeDriver: true }),
      ]);
      anim.start();
    });
    return () => {
      vivo = false;
      anim?.stop();
    };
  }, [valor, escala]);
  return <Animated.View style={{ transform: [{ scale: escala }] }}>{children}</Animated.View>;
}
