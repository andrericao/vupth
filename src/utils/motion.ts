import { useEffect, useState } from "react";
import { AccessibilityInfo, Easing } from "react-native";

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
