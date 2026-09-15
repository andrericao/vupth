/**
 * Qual peso cada botão do diálogo carrega.
 *
 * 🔴 A regra vem do arquivo de design (`MODAL · Deletar conta`), e a dedução
 * anterior a tinha INVERTIDO: lá o **cancelar é sólido** e só a ação
 * **destrutiva é vazada**, com a borda em forest e apenas o RÓTULO em danger.
 *
 * Isso não é estilo, é hierarquia: o peso vai para a **saída segura**, e a ação
 * sem volta fica disponível sem convidar. Vazar as duas — que era o que o
 * código fazia — deixa a escolha sem hierarquia nenhuma, numa caixa cujo ponto
 * inteiro é que uma das opções não tem volta.
 *
 * Sem ação destrutiva a hierarquia se inverte de novo, e com razão: aí o
 * confirmar É a ação principal, e é ele que fica sólido.
 */
export type PesoDoBotao = "solido" | "vazado" | "vazado-perigo";

export function pesoDoBotao(
  botoes: { estilo?: "default" | "cancel" | "destructive" }[],
  i: number
): PesoDoBotao {
  const estilo = botoes[i]?.estilo ?? "default";
  if (estilo === "destructive") return "vazado-perigo";

  const temDestrutivo = botoes.some((b) => b.estilo === "destructive");
  // Com uma ação sem volta na caixa, o sólido é a saída segura.
  if (temDestrutivo) return estilo === "cancel" ? "solido" : "vazado";
  return estilo === "cancel" ? "vazado" : "solido";
}
