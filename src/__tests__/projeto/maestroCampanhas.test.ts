import fs from "fs";
import path from "path";

// campanhas de teste do Maestro (André, 25/10): tudo 10 (R$ 10,00, 10%, 6 meses); cupom do Client
// CMAESTRO10. Os fluxos 25 e 26 NÃO fixam valor nem código: acham a campanha pelo nome e leem o resto da
// tela, então trocar o valor ou o código no Painel não quebra a bateria.
const ler = (f: string) => fs.readFileSync(path.resolve(__dirname, "../../..", f), "utf8");

describe("Maestro 25 e 26 — campanhas de teste", () => {
  const cupom = ler(".maestro/etapas/25_campanha_cupom.yaml");
  const link = ler(".maestro/etapas/26_campanha_link.yaml");

  it("o cupom lê o código da tela e não o fixa", () => {
    expect(cupom).toContain("copyTextFrom");
    expect(cupom).toContain("output.CODIGO");
    expect(cupom).not.toMatch(/CMAESTRO10|PMAESTRO10/);
  });

  it("nenhum dos dois fixa o valor da campanha (R$ 10,00 ou 10%)", () => {
    for (const f of [cupom, link]) {
      expect(f).not.toMatch(/assert[^\n]*(R\$ ?10|10%)/i);
    }
  });

  it("cada fluxo acha a campanha pelo nome exato do Painel", () => {
    expect(cupom).toContain('"MAESTRO CLIENT CUPOM"');
    expect(link).toContain('"MAESTRO CLIENT LINK"');
  });
});
