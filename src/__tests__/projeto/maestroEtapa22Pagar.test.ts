import fs from "fs";
import path from "path";

// pix-do-profissional-ao-concluir (André, 31/10, DEC-129): o modal de pagar não mostra chave, QR nem copia e cola;
// só "Já paguei" e "Fechar". O Maestro 22 confere isso, sem exigir Pix algum.
const yaml = fs.readFileSync(path.resolve(__dirname, "../../../.maestro/etapas/22_conjunta_finalizar_e_avaliar.yaml"), "utf8");

describe("Maestro 22 — o modal de pagar", () => {
  it("o Já paguei fica a vista", () => {
    expect(yaml).toContain('id: "pix-ja-paguei"');
  });

  it("confere que não há Pix no modal: sem drop down e sem chave", () => {
    expect(yaml).toMatch(/- assertNotVisible:\n\s+id: "pix-dropdown"/);
    expect(yaml).toMatch(/- assertNotVisible:\n\s+id: "pix-chave"/);
  });

  it("não exige QR, Copiar nem o texto de pagamento combinado", () => {
    for (const id of ["pix-qr", "pix-copiar", "pix-copiar-chave", "pix-combinado", "pix-profissional"]) {
      expect(yaml).not.toContain(`id: "${id}"`);
    }
  });
});
