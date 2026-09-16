import { pesoDoBotao } from "@domain\/pesoDoBotao";

// A hierarquia dos botões do diálogo — a regra que a dedução tinha invertido.
describe("pesoDoBotao", () => {
  const destrutivo = [{ estilo: "destructive" as const }, { estilo: "cancel" as const }];
  const comum = [{ estilo: "cancel" as const }, { estilo: "default" as const }];

  it("na caixa destrutiva, o SÓLIDO é a saída segura", () => {
    expect(pesoDoBotao(destrutivo, 0)).toBe("vazado-perigo");
    expect(pesoDoBotao(destrutivo, 1)).toBe("solido");
  });

  it("sem ação sem volta, o confirmar é que fica sólido", () => {
    expect(pesoDoBotao(comum, 0)).toBe("vazado");
    expect(pesoDoBotao(comum, 1)).toBe("solido");
  });

  it("as duas nunca ficam vazadas — seria escolha sem hierarquia", () => {
    for (const botoes of [destrutivo, comum]) {
      const pesos = botoes.map((_, i) => pesoDoBotao(botoes, i));
      expect(pesos.filter((p) => p === "solido")).toHaveLength(1);
    }
  });

  it("aviso de um botão só: ele é o sólido", () => {
    expect(pesoDoBotao([{ estilo: "default" }], 0)).toBe("solido");
  });
});
