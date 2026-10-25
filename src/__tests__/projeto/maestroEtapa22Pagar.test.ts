import fs from "fs";
import path from "path";

// pagar-sempre-disponivel (André, 25/10): a opção de pagar nunca some. O Maestro 22 não pode assumir que o
// profissional tem Pix: com Pix abre o drop down; sem ele confere o texto de pagamento combinado. O "Já paguei"
// e o "Fechar" ficam a vista nos dois casos.
const yaml = fs.readFileSync(path.resolve(__dirname, "../../../.maestro/etapas/22_conjunta_finalizar_e_avaliar.yaml"), "utf8");

describe("Maestro 22 — o modal de pagar", () => {
  it("o Já paguei fica a vista antes de qualquer drop down", () => {
    expect(yaml.indexOf('id: "pix-ja-paguei"')).toBeGreaterThan(-1);
    expect(yaml.indexOf('id: "pix-ja-paguei"')).toBeLessThan(yaml.indexOf('id: "pix-dropdown"'));
  });

  it("o drop down só abre quando existe, e o caso sem Pix confere o texto combinado", () => {
    expect(yaml).toMatch(/when:\n\s+visible:\n\s+id: "pix-dropdown"/);
    expect(yaml).toMatch(/when:\n\s+visible:\n\s+id: "pix-combinado"/);
    expect(yaml).toContain("Sem Pix cadastrado. O pagamento é combinado com o profissional (dinheiro).");
  });

  it("a chave do profissional em destaque é conferida quando existe (Copiar chave), sem exigir o gateway", () => {
    expect(yaml).toMatch(/when:\n\s+visible:\n\s+id: "pix-profissional"/);
    expect(yaml).toContain('id: "pix-copiar-chave"');
  });

  it("não exige o QR em todos os casos: ele só existe com código ou imagem do Pix", () => {
    expect(yaml).not.toMatch(/- assertVisible:\n\s+id: "pix-qr"/);
  });
});
