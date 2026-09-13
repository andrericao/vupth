import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Limpa o formulario quando a tela PERDE o foco.
 *
 * Por que precisa existir: o React Navigation mantem a tela MONTADA ao navegar
 * para outra — e isso e proposital, e o que preserva contexto ao voltar. O
 * efeito colateral e que tudo que foi digitado e nao salvo continua vivo no
 * `useState`, inclusive depois de o usuario ter ido embora da tela.
 *
 * Feedback de device (Andre 2026-09-09): "se o usuario comeca a digitar um
 * formulario das configuracoes e sai pra ir em outra tela, sem terminar, esse
 * dado nao some ao voltar".
 *
 * ⚠️ O ganho maior NAO e memoria — sao poucas strings. E que dado de formulario
 * abandonado nao deve sobreviver a saida da tela:
 *
 *   · `EditPassword` guarda TRES senhas em texto. Elas ficavam em memoria
 *     depois de o usuario sair, sem nada apagando.
 *   · Voltar e encontrar meio formulario preenchido de uma sessao anterior faz
 *     o usuario salvar sem querer o que havia digitado e desistido.
 *
 * O `useFocusEffect` roda a limpeza no CLEANUP, ou seja, ao perder o foco — e
 * nao ao ganhar. A diferenca importa: limpar ao ganhar apagaria valores que a
 * propria tela carregou (os dados atuais do perfil, por exemplo).
 */
export function useLimparAoSair(limpar: () => void) {
  useFocusEffect(
    useCallback(() => {
      return () => limpar();
      // `limpar` vem de dentro da tela e muda a cada render; a intencao e
      // "rodar ao sair", nao "re-registrar quando a funcao mudar".
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
}
