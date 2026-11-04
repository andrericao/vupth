import fs from "fs";
import path from "path";

// fluxo-sem-tela-duplicada (André, 03/11): a etapa 04 confere que o botão tocado na loja vale uma vez só e
// volta para a loja antes do 04.01 (que toca no profissional, na tela da loja).
const yaml = fs.readFileSync(path.resolve(__dirname, "../../../.maestro/etapas/04_fim_de_fila_hibrido.yaml"), "utf8");

describe("Maestro 04 — a intenção que veio da loja", () => {
  it("Agendar um horário: só o Agendar; Entrar com menor espera: só o Entrar na fila; e volta à loja", () => {
    const ordem = ["agendar-loja-aberta", "04.00d", "04.00g", "entrar-loja-aberta", "04.00k", "04.00m", "04.01"].map((t) =>
      yaml.indexOf(t),
    );
    ordem.forEach((i) => expect(i).toBeGreaterThan(-1));
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
  });

  it("o testID do Entrar com menor espera existe na tela da loja", () => {
    const tela = fs.readFileSync(path.resolve(__dirname, "../../screens/EstablishmentDetail.tsx"), "utf8");
    expect(tela).toContain('testID="entrar-loja-aberta"');
    expect(tela).toContain('testID="agendar-loja-aberta"');
  });
});
