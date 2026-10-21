// Identidade do diálogo por TIPO (design-modais, 17/10; pedido do Andre em
// 15/10, DEC-50: "os modais de alerta devem ter indicações diferentes").
//
// A regra em uma linha: o tipo é dito por uma FAIXA no topo e um SELO com
// ícone, nunca pela cor do botão. O primário é sempre brandGreen + forest; só a
// ação destrutiva troca para danger. O erro que isto evita: a borda da mesma
// cor do fundo, que era a única "identidade" que o cartão tinha.
//
// O componente recebe a VARIANTE, nunca um hex (DESIGN.md §5). Os valores saem
// do tokens.json (via `coresDoTema`), pelos NOMES do vupth-docs, e o par de cada
// tipo vale nos dois temas: o selo inverte sozinho (fundo escuro, texto na cor)
// e a faixa fica, como em design-modais.html.

import { coresDoTema, type NomeDeCor, type Tema } from "@domain/tema";

export type TipoDeDialogo = "informacao" | "atencao" | "dinheiro" | "erro";

export const TIPOS_DE_DIALOGO: TipoDeDialogo[] = ["informacao", "atencao", "dinheiro", "erro"];

export function tipoValido(tipo: unknown): tipo is TipoDeDialogo {
  return typeof tipo === "string" && (TIPOS_DE_DIALOGO as string[]).includes(tipo);
}

const NOMES_DO_DIALOGO = [
  "green",
  "onGreen",
  "greenTint",
  "onGreenTint",
  "accentPeach",
  "onAccentPeach",
  "dangerTint",
  "danger",
  "onDanger",
  "surface",
  "textPrimary",
  "textSecondary",
] as const;

/** Tema claro, pelos nomes do tokens.json (lidos de lá, não copiados). */
export const TOKENS_CLARO = Object.fromEntries(
  NOMES_DO_DIALOGO.map((nome) => [nome, coresDoTema("claro")[nome]]),
) as Record<(typeof NOMES_DO_DIALOGO)[number], string>;

const TIPOS: Record<
  TipoDeDialogo,
  { fundo: NomeDeCor; texto: NomeDeCor; corDaFaixa: NomeDeCor | null; faixa: boolean; selo: string }
> = {
  // Fato sem consequência: pedido enviado, você trocou de lugar.
  informacao: { fundo: "greenTint", texto: "onGreenTint", corDaFaixa: "green", faixa: true, selo: "Aviso" },
  // Prazo ou estado que pede ação: hora do almoço, fechamento, loja sem ponto.
  // A faixa é o `pessego` (o #FFC091 como COR): o token `accentPeach` é fundo e
  // no escuro vira um marrom (#4A2A10) que, como faixa de 6 px sobre o painel
  // forest, não se enxerga.
  atencao: { fundo: "accentPeach", texto: "onAccentPeach", corDaFaixa: "pessego", faixa: true, selo: "Atenção" },
  // Tudo que tem R$. Mesma cor do erro; o que os separa é a faixa.
  dinheiro: { fundo: "dangerTint", texto: "danger", corDaFaixa: "danger", faixa: true, selo: "Pagamento" },
  // Resposta a um toque que a pessoa acabou de dar: só o selo, sem faixa. Com
  // três vermelhos ninguém distinguiria nada; com faixa × sem faixa, sim.
  erro: { fundo: "dangerTint", texto: "danger", corDaFaixa: null, faixa: false, selo: "Erro" },
};

export type AparenciaDoTipo = {
  faixa: boolean;
  /** Cor da faixa de 6 px: FORTE (verde, pêssego, danger). O fundo do selo é o tom claro. */
  corDaFaixa: string | null;
  fundo: string;
  texto: string;
  selo: string;
};

/**
 * `selo` troca o rótulo ("Multa" no lugar de "Pagamento") sem trocar o tipo.
 * Sem `tema` vale o claro.
 */
export function aparenciaDoTipo(tipo: TipoDeDialogo, selo?: string, tema: Tema = "claro"): AparenciaDoTipo {
  const t = TIPOS[tipo];
  const cores = coresDoTema(tema);
  return {
    faixa: t.faixa,
    // A faixa em dangerTint (#F7E4E2) sobre o branco do cartao mal se ve: a tabela
    // dizia "faixa e selo: dangerTint" e os mockups desenhavam a faixa forte. Vale o
    // mockup: o tipo e dito por uma faixa que se ENXERGA, e o selo fica no tom claro.
    corDaFaixa: t.corDaFaixa ? cores[t.corDaFaixa] : null,
    fundo: cores[t.fundo],
    texto: cores[t.texto],
    selo: selo?.trim() || t.selo,
  };
}

export type PapelDoBotao = "primario" | "secundario" | "perigo";

const BOTOES: Record<PapelDoBotao, { fundo: NomeDeCor; texto: NomeDeCor }> = {
  // O botão primário é o único par que não muda de tema.
  primario: { fundo: "green", texto: "onGreen" },
  // `sobrePainel`: surface no claro e surfaceAlt no escuro. A surface do escuro é
  // a cor do próprio painel, e o botão secundário sumiria dentro dele.
  secundario: { fundo: "sobrePainel", texto: "textPrimary" },
  perigo: { fundo: "danger", texto: "onDanger" },
};

/** Fundo e rótulo de cada papel de botão do diálogo com tipo, no tema. */
export function aparenciaDoBotao(papel: PapelDoBotao, tema: Tema = "claro"): { fundo: string; texto: string } {
  const cores = coresDoTema(tema);
  return { fundo: cores[BOTOES[papel].fundo], texto: cores[BOTOES[papel].texto] };
}

type EstiloDoBotao = { estilo?: "default" | "cancel" | "destructive" };

/**
 * Qual papel cada botão tem num diálogo com tipo.
 *
 * Diferente do `pesoDoBotao` (o diálogo sem tipo, que dá o peso à saída segura):
 * aqui o primário é a ação que CONFIRMA o título. Se ela é destrutiva (sair da
 * fila com multa, excluir) o primário é `danger`; o cancelar é sempre o
 * secundário. Sem destrutivo, o primeiro "default" é o verde e os outros viram
 * secundários — nunca dois primários empilhados.
 */
export function papelDoBotao(botoes: EstiloDoBotao[], i: number): PapelDoBotao {
  const estilo = botoes[i]?.estilo ?? "default";
  if (estilo === "destructive") return "perigo";
  if (estilo === "cancel") return "secundario";
  const temDestrutivo = botoes.some((b) => b.estilo === "destructive");
  if (temDestrutivo) return "secundario";
  const primeiroDefault = botoes.findIndex((b) => (b.estilo ?? "default") === "default");
  return primeiroDefault === i ? "primario" : "secundario";
}

/**
 * Ordem em que os botões aparecem: o primário em cima, o "Cancelar" embaixo
 * (design-modais: "pílulas empilhadas, primário em cima"). O ÍNDICE que o
 * diálogo devolve é o da lista original — quem chama (e o `dialogo-botao-N` da
 * bateria Maestro) continua achando cada botão onde sempre achou.
 */
export function ordemDosBotoes(botoes: EstiloDoBotao[]): number[] {
  const peso = (i: number) => (botoes[i]?.estilo === "cancel" ? 1 : 0);
  return botoes
    .map((_, i) => i)
    .sort((a, b) => peso(a) - peso(b) || a - b);
}
