import {
  TIPOS_DE_DIALOGO,
  TOKENS_CLARO,
  aparenciaDoTipo,
  ordemDosBotoes,
  papelDoBotao,
  tipoValido,
} from "@domain/tipoDeDialogo";
import { coresNoGluestack } from "@domain/tema";

// modais-de-alerta (design-modais, 17/10; DEC-50): o tipo e dito por uma faixa
// no topo e um selo com icone, nunca pela cor do botao.

// O tema do Gluestack e a fonte das cores; este arquivo so da nome as cores do
// dialogo. Pergunta ao proprio `coresNoGluestack`, que alimenta o config: o teste
// lia o TEXTO do config com uma regex e quebrou quando os valores passaram a morar
// em tokens.json (a `dev` ficou vermelha logo apos o merge do modo escuro).
const CLARO = coresNoGluestack("claro") as unknown as Record<string, string>;
const doTema = (nome: string): string => {
  const valor = CLARO[nome];
  if (!valor) throw new Error(`token ${nome} nao existe no tema claro do Gluestack`);
  return valor;
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
    expect(aparenciaDoTipo("informacao")).toEqual({ faixa: true, fundo: "#E2F6D5", texto: "#163300", selo: "Aviso" });
    expect(aparenciaDoTipo("atencao")).toEqual({ faixa: true, fundo: "#FFC091", texto: "#163300", selo: "Atenção" });
    expect(aparenciaDoTipo("dinheiro")).toEqual({ faixa: true, fundo: "#F7E4E2", texto: "#B3261E", selo: "Pagamento" });
    expect(aparenciaDoTipo("erro")).toEqual({ faixa: false, fundo: "#F7E4E2", texto: "#B3261E", selo: "Erro" });
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
