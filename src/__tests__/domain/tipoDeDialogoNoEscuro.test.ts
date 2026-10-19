import {
  TIPOS_DE_DIALOGO,
  TOKENS_CLARO,
  aparenciaDoBotao,
  aparenciaDoTipo,
  type PapelDoBotao,
  type TipoDeDialogo,
} from "@domain/tipoDeDialogo";
import { coresDoTema, type Tema } from "@domain/tema";
import { contraste } from "@domain/contrast";

// modo escuro (DEC-75): o tipo do dialogo e dito pela mesma faixa e pelo mesmo selo
// nos dois temas. Os hex abaixo sao os de design-modais.html ("Selo no escuro" e os
// mockups ② e ⑤), conferidos a mao e nao lidos do tokens.json: se o JSON mudar sem a
// Design mudar o desenho, este teste reprova.
const TEMAS: Tema[] = ["claro", "escuro"];

describe("aparenciaDoTipo no escuro (design-modais.html)", () => {
  it.each<[TipoDeDialogo, { faixa: string | null; fundo: string; texto: string }]>([
    ["informacao", { faixa: "#9FE870", fundo: "#223D0D", texto: "#9FE870" }],
    // a faixa de atencao e o pessego #FFC091 (onAccentPeach no escuro), nao o marrom do fundo do selo
    ["atencao", { faixa: "#FFC091", fundo: "#4A2A10", texto: "#FFC091" }],
    ["dinheiro", { faixa: "#FFB4AB", fundo: "#4A1A16", texto: "#FFB4AB" }],
    ["erro", { faixa: null, fundo: "#4A1A16", texto: "#FFB4AB" }],
  ])("%s: faixa, fundo e texto do selo", (tipo, esperado) => {
    const a = aparenciaDoTipo(tipo, undefined, "escuro");
    expect(a.corDaFaixa).toBe(esperado.faixa);
    expect(a.fundo).toBe(esperado.fundo);
    expect(a.texto).toBe(esperado.texto);
  });

  it("so o erro continua sem faixa, e o rotulo do selo nao depende do tema", () => {
    expect(TIPOS_DE_DIALOGO.filter((t) => !aparenciaDoTipo(t, undefined, "escuro").faixa)).toEqual(["erro"]);
    for (const tipo of TIPOS_DE_DIALOGO) {
      expect(aparenciaDoTipo(tipo, undefined, "escuro").selo).toBe(aparenciaDoTipo(tipo).selo);
    }
    expect(aparenciaDoTipo("dinheiro", "Multa", "escuro").selo).toBe("Multa");
  });

  it("sem tema vale o claro: nada mudou para quem nao passa o tema", () => {
    for (const tipo of TIPOS_DE_DIALOGO) {
      expect(aparenciaDoTipo(tipo)).toEqual(aparenciaDoTipo(tipo, undefined, "claro"));
    }
    expect(aparenciaDoTipo("atencao")).toEqual({
      faixa: true,
      corDaFaixa: "#FFC091",
      fundo: "#FFC091",
      texto: "#163300",
      selo: "Atenção",
    });
  });

  it("TOKENS_CLARO sao os hex do tokens.json no claro, com os mesmos nomes de antes", () => {
    const claro = coresDoTema("claro");
    for (const [nome, hex] of Object.entries(TOKENS_CLARO)) {
      expect(hex).toBe(claro[nome as keyof typeof claro]);
    }
    expect(Object.keys(TOKENS_CLARO).sort()).toEqual(
      [
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
      ].sort(),
    );
  });
});

describe.each(TEMAS)("contraste do dialogo no tema %s", (tema) => {
  it("o texto do selo passa de 4,5:1 sobre o fundo dele, em todo tipo", () => {
    for (const tipo of TIPOS_DE_DIALOGO) {
      const a = aparenciaDoTipo(tipo, undefined, tema);
      expect(contraste(a.texto, a.fundo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("o rotulo de cada botao passa de 4,5:1 sobre o fundo dele", () => {
    for (const papel of ["primario", "secundario", "perigo"] as PapelDoBotao[]) {
      const b = aparenciaDoBotao(papel, tema);
      expect(contraste(b.texto, b.fundo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("titulo, corpo e erro passam de 4,5:1 sobre o painel", () => {
    const c = coresDoTema(tema);
    expect(contraste(c.textPrimary, c.painel)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(c.textSecondary, c.painel)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(c.danger, c.painel)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("a faixa se enxerga sobre o painel", () => {
  it("no escuro, as tres faixas passam de 3:1 (componente grafico)", () => {
    const painel = coresDoTema("escuro").painel;
    for (const tipo of ["informacao", "atencao", "dinheiro"] as const) {
      const faixa = aparenciaDoTipo(tipo, undefined, "escuro").corDaFaixa as string;
      expect(contraste(faixa, painel)).toBeGreaterThanOrEqual(3);
    }
  });

  it("a atencao usa o pessego, e nao o fundo do selo: o marrom do escuro sumiria no painel", () => {
    const a = aparenciaDoTipo("atencao", undefined, "escuro");
    expect(a.corDaFaixa).not.toBe(a.fundo);
    expect(contraste(a.fundo, coresDoTema("escuro").painel)).toBeLessThan(3);
  });
});

describe("aparenciaDoBotao", () => {
  it("claro: os hex de antes", () => {
    expect(aparenciaDoBotao("primario")).toEqual({ fundo: "#9FE870", texto: "#163300" });
    expect(aparenciaDoBotao("secundario")).toEqual({ fundo: "#F3F5F1", texto: "#163300" });
    expect(aparenciaDoBotao("perigo")).toEqual({ fundo: "#B3261E", texto: "#FFFFFF" });
  });

  it("escuro: o secundario sobe um nivel (a surface seria a cor do proprio painel) e o perigo inverte", () => {
    expect(aparenciaDoBotao("secundario", "escuro")).toEqual({ fundo: "#1F3F0B", texto: "#F3F5F1" });
    expect(aparenciaDoBotao("perigo", "escuro")).toEqual({ fundo: "#FFB4AB", texto: "#4A1A16" });
    expect(aparenciaDoBotao("secundario", "escuro").fundo).not.toBe(coresDoTema("escuro").painel);
  });

  it("o primario nao muda de tema", () => {
    expect(aparenciaDoBotao("primario", "escuro")).toEqual(aparenciaDoBotao("primario", "claro"));
  });
});
