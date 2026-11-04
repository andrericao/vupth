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

// avaliar-agora-nao-encostado-na-borda (CLI-21, DEC-184): o print do modal de avaliar vem do Maestro.
describe("Maestro 22 — print do Agora não no modal de avaliar", () => {
  it("depois de abrir o Avaliar, espera o Agora não e tira o print para o André", () => {
    const abriu = yaml.indexOf('label: "22.0A · toca em Avaliar atendimento"');
    const agora = yaml.indexOf('visible: "Agora não"', abriu);
    const print = yaml.indexOf("../apoio/para_o_andre.yaml", agora);
    expect(abriu).toBeGreaterThan(-1);
    expect(agora).toBeGreaterThan(abriu);
    expect(print).toBeGreaterThan(agora);
    expect(yaml.indexOf('NOME: "22_avaliar_agora_nao"', print)).toBeGreaterThan(print);
    // e o print sai antes de dar as estrelas, com o modal ainda inteiro
    expect(yaml.indexOf('id: "star-5"', abriu)).toBeGreaterThan(print);
  });

  it("o Agora não existe no modal de avaliar", () => {
    const modal = fs.readFileSync(path.resolve(__dirname, "../../../src/components/RatingModal.tsx"), "utf8");
    expect(modal).toContain('title="Agora não"');
  });
});
