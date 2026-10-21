import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

// Entrada e saída do diálogo (design-motion, peça 2, 17/10):
//   entrada — véu 250 ms; cartão sobe 24 px e escala 0,96 → 1 em 450 ms na curva
//             do app; a faixa se revela da esquerda em 500 ms
//   saída   — o inverso, tudo em 200 ms
//
// O RN anima o `Modal` sozinho só com fade ("fade"/"slide"), então o `Modal`
// fica com `animationType="none"` e o movimento mora aqui, por dentro. Isso tem
// um preço: a saída precisa de tempo, e a loja já esvaziou o `atual` no toque.
// Por isso o hook devolve `mostrado`, o último pedido, que fica montado até a
// saída acabar — sem ele o cartão sumiria seco e a saída de 200 ms seria
// decoração.
const CURVA_DO_APP = Easing.bezier(0.2, 0.8, 0.2, 1);
const CURVA_DA_FAIXA = Easing.bezier(0.65, 0, 0.35, 1);
const CURVA_DA_SAIDA = Easing.bezier(0.4, 0, 1, 1);

export const MOVIMENTO_DO_DIALOGO = {
  veu: 250,
  cartao: 450,
  faixa: 500,
  saida: 200,
  sobe: 24,
  escalaInicial: 0.96,
} as const;

export function useAnimacaoDoDialogo<T>(atual: T | null) {
  // O último pedido, guardado para o cartão poder SAIR depois de a loja já ter
  // esvaziado o `atual`. Atualizado durante o render (e não num efeito) para o
  // pedido novo nunca aparecer um quadro com o conteúdo do anterior.
  const [retido, setRetido] = useState<T | null>(atual);
  if (atual && atual !== retido) setRetido(atual);

  const [veu] = useState(() => new Animated.Value(0));
  const [cartao] = useState(() => new Animated.Value(0));
  const [faixa] = useState(() => new Animated.Value(0));

  // Estado para o render (sem animação não há saída para esperar) e ref para o
  // efeito (que não deve recomeçar a animação quando o ajuste do aparelho muda).
  // O host fica montado a vida inteira do app, então a resposta do sistema já
  // chegou quando o primeiro aviso abre.
  const [reduzido, setReduzido] = useState(false);
  const reduzidoRef = useRef(false);
  if (!atual && reduzido && retido) setRetido(null);

  useEffect(() => {
    let vivo = true;
    const aplicar = (v: boolean) => {
      // So muda o estado quando o ajuste difere: o caso comum (movimento
      // normal) nao redesenha o host so para confirmar o que ele ja sabia.
      if (!vivo || v === reduzidoRef.current) return;
      reduzidoRef.current = v;
      setReduzido(v);
    };
    AccessibilityInfo.isReduceMotionEnabled().then(aplicar, () => {});
    const assinatura = AccessibilityInfo.addEventListener("reduceMotionChanged", aplicar);
    return () => {
      vivo = false;
      assinatura.remove();
    };
  }, []);

  useEffect(() => {
    if (atual) {
      if (reduzidoRef.current) {
        veu.setValue(1);
        cartao.setValue(1);
        faixa.setValue(1);
        return;
      }
      veu.setValue(0);
      cartao.setValue(0);
      faixa.setValue(0);
      const m = MOVIMENTO_DO_DIALOGO;
      const entrada = Animated.parallel([
        Animated.timing(veu, { toValue: 1, duration: m.veu, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(cartao, { toValue: 1, duration: m.cartao, easing: CURVA_DO_APP, useNativeDriver: true }),
        Animated.timing(faixa, { toValue: 1, duration: m.faixa, easing: CURVA_DA_FAIXA, useNativeDriver: true }),
      ]);
      entrada.start();
      return () => entrada.stop();
    }

    // Sem pedido na loja: se há um cartão na tela, ele sai; se não, nada a fazer.
    if (!retido || reduzidoRef.current) return;
    const saida = Animated.parallel(
      [veu, cartao, faixa].map((v) =>
        Animated.timing(v, {
          toValue: 0,
          duration: MOVIMENTO_DO_DIALOGO.saida,
          easing: CURVA_DA_SAIDA,
          useNativeDriver: true,
        })
      )
    );
    saida.start(({ finished }) => {
      // Interrompida (outro diálogo entrou no meio): quem interrompeu cuida.
      if (finished) setRetido(null);
    });
    return () => saida.stop();
  }, [atual, retido, veu, cartao, faixa]);

  const mostrado = atual ?? (reduzido ? null : retido);

  const estiloDoVeu = { opacity: veu };
  const estiloDoCartao = {
    opacity: cartao,
    transform: [
      { translateY: cartao.interpolate({ inputRange: [0, 1], outputRange: [MOVIMENTO_DO_DIALOGO.sobe, 0] }) },
      { scale: cartao.interpolate({ inputRange: [0, 1], outputRange: [MOVIMENTO_DO_DIALOGO.escalaInicial, 1] }) },
    ],
  };
  // scaleX com a origem na esquerda: a faixa "cresce" da esquerda para a direita
  // só com transform, que roda no driver nativo (largura não roda).
  const estiloDaFaixa = {
    transform: [{ scaleX: faixa }],
    transformOrigin: "0% 50%" as const,
  };

  return { mostrado, estiloDoVeu, estiloDoCartao, estiloDaFaixa };
}
