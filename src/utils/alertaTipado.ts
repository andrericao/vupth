import { Alert, type AlertButton } from "react-native";

import type { TipoDeDialogo } from "@domain/tipoDeDialogo";

/**
 * `Alert.alert` com a identidade do aviso: faixa no topo e selo com icone
 * (design-modais, 17/10; DEC-50: "os modais de alerta devem ter indicacoes
 * diferentes").
 *
 *   informacao  fato sem consequencia (pedido enviado, voce trocou de lugar)
 *   atencao     prazo ou estado que pede acao (sua vez esta chegando)
 *   dinheiro    tudo que tem R$ (multa, pagamento pendente, Pix)
 *   erro        falha que a pessoa nao causou (sem conexao, nao deu para sair)
 *
 * O tipo e dito pela faixa e pelo selo, nunca pela cor do botao: o primario e
 * sempre verde-marca, e so a acao `destructive` e vermelha — use `destructive`
 * quando a acao GERA a multa ou apaga, nao so porque o aviso fala de dinheiro.
 *
 * O `Alert.alert` e interceptado por `alertNativo` (a caixa da marca) e o tipo
 * viaja no 4o argumento. So o nativo desenha faixa e selo: na web o shim do Alert
 * nao os tem e o aviso sai como sempre saiu; sem a caixa montada, cai no Alert do
 * sistema, sem tipo (feio e visivel e melhor que bonito e invisivel).
 *
 * Mesma assinatura das chamadas de hoje, entao adotar e trocar `Alert.alert(` por
 * `alertaTipado(` e juntar o tipo:
 *
 *   alertaTipado("Sair da fila", "R$ 3,00 de multa no proximo atendimento.", botoes,
 *     { tipo: "dinheiro", selo: "Multa" });
 */
export function alertaTipado(
  titulo: string,
  mensagem: string | undefined,
  botoes: AlertButton[] | undefined,
  opcoes: { tipo: TipoDeDialogo; selo?: string; cancelable?: boolean }
): void {
  // O 4o argumento do Alert.alert tipa so `cancelable`/`onDismiss`: o resto
  // segue por conta do alertNativo, que o le e o tira antes do Alert do sistema.
  Alert.alert(titulo, mensagem, botoes, opcoes as never);
}
