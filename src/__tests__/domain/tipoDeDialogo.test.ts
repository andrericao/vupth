import fs from "fs";
import path from "path";

import {
  TIPOS_DE_DIALOGO,
  TOKENS_CLARO,
  aparenciaDoTipo,
  ordemDosBotoes,
  papelDoBotao,
  tipoValido,
} from "@domain/tipoDeDialogo";

// modais-de-alerta (design-modais, 17/10; DEC-50): o tipo e dito por uma faixa
// no topo e um selo com icone, nunca pela cor do botao.

// O tema do Gluestack e a fonte das cores; este arquivo so da nome as cores do
// dialogo. Le o texto do config (e um .ts do app, nao um modulo para importar).
const CONFIG = fs.readFileSync(path.resolve(__dirname, "../../../config/gluestack-ui.config.ts"), "utf8");
const doTema = (nome: string): string => {
  const m = new RegExp(`\\b${nome}:\\s*'(#[0-9A-Fa-f]{6})'`).exec(CONFIG);
  if (!m) throw new Error(`token ${nome} nao existe no config do Gluestack`);
  return m[1];
};

function luminancia(hex: string): number {
  const c = hex.replace("#", "");
  const canal = (i: number) => {
    const v = parseInt(c.slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}
function razao(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe("tokens do dialogo (tema claro)", () => {
  // Os dois lados falam a mesma cor. Um hex que muda de um lado e nao do outro e
  // como as tabelas divergiram da ultima vez.
  it.each([
    ["green", "brandGreen"],
    ["greenTint", "greenTint"],
    ["accentPeach", "brandWarning"],
    ["dangerTint", "brandDangerTint"],
    ["danger", "brandDanger"],
    ["surface", "brandSurface"],
    ["textPrimary", "brandTextPrimary"],
    ["textSecondary", "brandTextSecondary"],
    ["onGreen", "forest"],
    ["onGreenTint", "forest"],
    ["onAccentPeach", "forest"],
  ] as const)("%s == %s do tema do Gluestack", (token, doGluestack) => {
    expect(TOKENS_CLARO[token].toUpperCase()).toBe(doTema(doGluestack).toUpperCase());
  });

  it("cada par fundo/texto passa de 4,5:1 (o teste de tokens do desenho)", () => {
    for (const tipo of TIPOS_DE_DIALOGO) {
      const a = aparenciaDoTipo(tipo);
      expect(razao(a.fundo, a.texto)).toBeGreaterThanOrEqual(4.5);
    }
    expect(razao(TOKENS_CLARO.green, TOKENS_CLARO.onGreen)).toBeGreaterThanOrEqual(4.5);
    expect(razao(TOKENS_CLARO.danger, TOKENS_CLARO.onDanger)).toBeGreaterThanOrEqual(4.5);
    expect(razao(TOKENS_CLARO.surface, TOKENS_CLARO.textPrimary)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("aparenciaDoTipo", () => {
  it("so o erro nao tem faixa — dinheiro e erro dividem a cor, nao a forma", () => {
    expect(TIPOS_DE_DIALOGO.filter((t) => !aparenciaDoTipo(t).faixa)).toEqual(["erro"]);
    expect(aparenciaDoTipo("dinheiro").fundo).toBe(aparenciaDoTipo("erro").fundo);
  });

  it("cada tipo tem o seu selo e as suas cores", () => {
    expect(aparenciaDoTipo("informacao")).toEqual({ faixa: true, corDaFaixa: "#9FE870", fundo: "#E2F6D5", texto: "#163300", selo: "Aviso" });
    expect(aparenciaDoTipo("atencao")).toEqual({ faixa: true, corDaFaixa: "#FFC091", fundo: "#FFC091", texto: "#163300", selo: "Atenção" });
    expect(aparenciaDoTipo("dinheiro")).toEqual({ faixa: true, corDaFaixa: "#B3261E", fundo: "#F7E4E2", texto: "#B3261E", selo: "Pagamento" });
    expect(aparenciaDoTipo("erro")).toEqual({ faixa: false, corDaFaixa: null, fundo: "#F7E4E2", texto: "#B3261E", selo: "Erro" });
  });

  it("o selo troca de rotulo sem trocar de tipo; vazio nao apaga o rotulo", () => {
    expect(aparenciaDoTipo("dinheiro", "Multa").selo).toBe("Multa");
    expect(aparenciaDoTipo("dinheiro", "  ").selo).toBe("Pagamento");
  });

  it("tipoValido recusa o que nao e um dos quatro", () => {
    expect(tipoValido("atencao")).toBe(true);
    expect(tipoValido("perigo")).toBe(false);
    expect(tipoValido(undefined)).toBe(false);
    expect(tipoValido(3)).toBe(false);
  });
});

describe("papel e ordem dos botoes", () => {
  const cancelar = { estilo: "cancel" as const };
  const confirmar = { estilo: "default" as const };
  const destruir = { estilo: "destructive" as const };

  it("confirmar e verde, cancelar e secundario — nunca dois primarios", () => {
    const b = [cancelar, confirmar];
    expect(papelDoBotao(b, 0)).toBe("secundario");
    expect(papelDoBotao(b, 1)).toBe("primario");
  });

  it("so a acao destrutiva troca para danger; ela e o primario da caixa", () => {
    const b = [cancelar, destruir];
    expect(papelDoBotao(b, 0)).toBe("secundario");
    expect(papelDoBotao(b, 1)).toBe("perigo");
  });

  it("com destrutivo na caixa, os outros 'default' sao secundarios", () => {
    const b = [cancelar, confirmar, destruir];
    expect(b.map((_, i) => papelDoBotao(b, i))).toEqual(["secundario", "secundario", "perigo"]);
  });

  it("dois 'default' sem destrutivo: so o primeiro e verde", () => {
    const b = [confirmar, confirmar];
    expect(b.map((_, i) => papelDoBotao(b, i))).toEqual(["primario", "secundario"]);
  });

  it("botao sem estilo conta como 'default'", () => {
    expect(papelDoBotao([{}], 0)).toBe("primario");
  });

  it("o primario sobe e o cancelar desce; os indices continuam os da lista original", () => {
    expect(ordemDosBotoes([cancelar, confirmar])).toEqual([1, 0]);
    expect(ordemDosBotoes([cancelar, confirmar, destruir])).toEqual([1, 2, 0]);
    expect(ordemDosBotoes([confirmar])).toEqual([0]);
    expect(ordemDosBotoes([confirmar, cancelar])).toEqual([0, 1]);
  });
});

// A faixa em dangerTint (#F7E4E2) sobre o branco do cartao mal se via: a tabela da
// Design dizia "faixa e selo: dangerTint" e os mockups desenhavam a faixa forte.
describe("a faixa e forte e o selo e o tom claro", () => {
  it.each([
    ["informacao", "#9FE870"],
    ["dinheiro", "#B3261E"],
  ] as const)("%s: faixa %s, diferente do tom claro do selo", (tipo, cor) => {
    const a = aparenciaDoTipo(tipo);
    expect(a.corDaFaixa).toBe(cor);
    expect(a.corDaFaixa).not.toBe(a.fundo);
  });

  it("a atencao usa o mesmo pessego na faixa e no selo: ele ja e forte", () => {
    expect(aparenciaDoTipo("atencao")).toMatchObject({ corDaFaixa: "#FFC091", fundo: "#FFC091" });
  });

  it("o erro nao tem faixa e nao tem cor de faixa", () => {
    expect(aparenciaDoTipo("erro")).toMatchObject({ faixa: false, corDaFaixa: null });
  });

  it("a faixa de dinheiro se separa do branco do cartao (3:1, componente grafico)", () => {
    expect(razao(aparenciaDoTipo("dinheiro").corDaFaixa as string, "#FFFFFF")).toBeGreaterThanOrEqual(3);
  });
});
