// Estilos RN reutilizaveis do design system (espelha o front-partner).

/**
 * Sombra do que FLUTUA sobre o conteudo: tab bar, botao flutuante (FAB) e
 * notificacao. Nada mais.
 *
 * [marca-vupth] Era `cardShadow`, aplicada em ~19 arquivos — praticamente todo
 * card do app. Contamos o desenho: no `pencil-new.pen` INTEIRO existem 13
 * elementos com sombra, e todos flutuam de verdade (as 5 tab bars, o FAB, o
 * sino, a notificacao, os cards de resumo sobre forest). Card sobre `surface`
 * e SEMPRE plano la.
 *
 * O motivo nao e purismo: sombra e affordance de toque. Quando todo card tem
 * sombra, todo card parece botao. O que separa um card do fundo branco e o
 * proprio `$brandSurface`, nao a elevacao.
 *
 * O rename foi de proposito: obriga a revisar cada ponto de uso em vez de o
 * import antigo continuar passando batido.
 */
export const floatingShadow = {
  // tema-fixo: sombra forest a 8%, sem texto; no escuro ela some contra o fundo e o que separa a peca e o painel
  shadowColor: "#163300", // [marca-vupth] $forest
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
};
