import fs from "fs";
import path from "path";

// contestar-multa (CLI-23, 05/11): a multa de teste vem da API do staging, o cliente contesta em Atendimentos e a
// multa sai da lista; sem a rota no ar, a etapa pula.
const ROOT = path.resolve(__dirname, "../../..");
const ler = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");

describe("Maestro 32 — contestar multa", () => {
  const etapa = ler(".maestro/etapas/32_contestar_multa.yaml");
  const avulsa = ler(".maestro/avulsas/32_contestar_multa.yaml");
  const script = ler(".maestro/scripts/multa_de_teste.js");
  const bateria = ler(".maestro/bateria.sh");

  it("a avulsa prepara a conta e roda a etapa com o e-mail da conta", () => {
    expect(avulsa).toMatch(/ETAPA: "32"/);
    expect(avulsa).toMatch(/CONTA: "1"/);
    expect(avulsa).toContain("EMAIL_CLIENTE: ${output.EMAIL_CLIENTE}");
    expect(avulsa).toMatch(/etapas\/32_contestar_multa\.yaml/);
  });

  it("a bateria roda a 32 por padrão, sozinha (não é conjunta)", () => {
    expect(bateria).toMatch(/ETAPAS_PADRAO="[^"]*\b31 32\b[^"]*"/);
    expect(bateria).not.toMatch(/CONJUNTAS="[^"]*\b32\b[^"]*"/);
  });

  it("o script semeia pela rota de teste e trata o 404 como pulo", () => {
    expect(script).toContain("/test/penalties");
    expect(script).toContain("r.status === 201");
    expect(script).toContain("r.status !== 404");
    expect(etapa).toContain("PULADO-MULTA");
  });

  it("semeia, abre Atendimentos, contesta com motivo, vê a confirmação e a multa sai, nesta ordem", () => {
    const passos = [
      "multa_de_teste.js",
      'text: "Atendimentos"',
      'id: "multas-em-atendimentos"',
      'id: "contestar-${output.MULTA_ID}"',
      'id: "contestar-multa-motivo"',
      'id: "contestar-multa-enviar"',
      'id: "contestar-multa-enviada"',
      'id: "contestar-multa-fechar"',
      "notVisible:",
    ];
    let pos = -1;
    for (const p of passos) {
      const i = etapa.indexOf(p, pos + 1);
      expect(i).toBeGreaterThan(pos);
      pos = i;
    }
  });
});
