import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

// Curvas e tempos do movimento do app. A tabela completa, com o porquê de cada
// número, vive no vupth-docs (aba Design, Motion); aqui ficam só os que o código
// usa, para uma tela não inventar a própria curva.
//
// Só animamos `transform`, `opacity` e a largura de um recorte: o resto
// (altura, cor de fundo, sombra) trava a thread de UI no aparelho médio.
export const EASE = {
  /** Entradas: sai rápido e assenta devagar. */
  entrada: Easing.bezier(0.2, 0.8, 0.2, 1),
  /** Varreduras e revelações: começa e termina suave. */
  varredura: Easing.bezier(0.65, 0, 0.35, 1),
  /** Saídas: acelera até sumir, sem assentar. */
  saida: Easing.bezier(0.4, 0, 1, 1),
};

export const MS = {
  /** Retorno ao toque: é resposta, não enfeite. */
  toque: 120,
  entrada: 450,
  saida: 450,
  /** Meia volta do pulso da abertura; o ciclo inteiro dura o dobro. */
  pulso: 1200,
};

// "Remover animações" do Android e "Reduzir movimento" do iOS. Quem liga isso
// espera a tela pronta, não uma coreografia: toda animação nova consulta aqui.
// O erro cai em `false` de propósito: um aparelho sem o módulo (web, jest) deve
// animar como o resto, não ficar sem retorno nenhum.
export async function movimentoReduzido(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}

/** O mesmo valor como estado, acompanhando a mudança feita nos ajustes com o app aberto. */
export function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    let vivo = true;
    movimentoReduzido().then((r) => {
      if (vivo) setReduzido(r);
    });
    const assinatura = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduzido);
    return () => {
      vivo = false;
      assinatura?.remove?.();
    };
  }, []);
  return reduzido;
}

/**
 * Entrada suave de um elemento que acaba de aparecer: opacidade e deslize de `dy`
 * pontos, uma vez, ao montar. Devolve o estilo animado para quem precisa animar o
 * PRÓPRIO elemento (faixas de posição absoluta, que não podem ganhar um invólucro
 * sem perder o `top`/`left` que as ancora). Com movimento reduzido já nasce pronto.
 * `chave` reinicia a entrada quando muda: a faixa que só aparece depois de um dado
 * chegar (o atendimento a avaliar) entra a cada novo valor, e não gasta a animação
 * enquanto ainda não existe.
 * Só `transform` e `opacity`: rodam no driver nativo.
 */
export function useEntrada({
  dy = 12,
  atraso = 0,
  duracao = MS.entrada,
  chave,
}: { dy?: number; atraso?: number; duracao?: number; chave?: unknown } = {}) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let vivo = true;
    let anim: Animated.CompositeAnimation | null = null;
    v.setValue(0);
    movimentoReduzido().then((reduzido) => {
      if (!vivo) return;
      if (reduzido) {
        v.setValue(1);
        return;
      }
      anim = Animated.timing(v, { toValue: 1, duration: duracao, delay: atraso, easing: EASE.entrada, useNativeDriver: true });
      anim.start();
    });
    return () => {
      vivo = false;
      anim?.stop();
    };
  }, [v, atraso, duracao, chave]);
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }] };
}
