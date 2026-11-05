import fs from "fs";
import path from "path";

// teste-link-de-participacao (CLI-3, 05/11): o cliente novo abre o link do profissional, entra na conta e o corte
// e concluido no Partner; o profissional ganha o indicado na campanha "Teste de Lançamento".
const ROOT = path.resolve(__dirname, "../../..");
const ler = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");

describe("Maestro 31 — link de participação", () => {
  const etapa = ler(".maestro/etapas/31_conjunta_link_de_participacao.yaml");
  const avulsa = ler(".maestro/avulsas/31_conjunta_link_de_participacao.yaml");
  const bateria = ler(".maestro/bateria.sh");

  it("a avulsa monta a loja, deixa o app como visitante e usa a campanha do André", () => {
    expect(avulsa).toMatch(/ETAPA: "31"/);
    expect(avulsa).toMatch(/LOJA: "1"/);
    expect(avulsa).toMatch(/CONTA: "0"/);
    expect(avulsa).toContain('NOME_CAMPANHA: "Teste de Lançamento"');
    expect(avulsa).toMatch(/scripts\/cliente\.js/);
    expect(avulsa).toMatch(/etapas\/31_conjunta_link_de_participacao\.yaml/);
  });

  it("a bateria roda a 31 por padrão, como conjunta (abre o Partner)", () => {
    expect(bateria).toMatch(/ETAPAS_PADRAO="[^"]*\b30 31\b[^"]*"/);
    expect(bateria).toMatch(/CONJUNTAS="[^"]*\b31\b[^"]*"/);
  });

  it("sem a campanha no ar, pula (PULADO-CAMPANHA), não falha", () => {
    expect(etapa).toContain("${output.EXISTE != '1'}");
    expect(etapa).toContain("PULADO-CAMPANHA");
  });

  it("abre o link, entra, confere o indicado, entra na fila, o Partner finaliza e o corte aparece, nesta ordem", () => {
    const passos = [
      'ACAO: "participar"',
      "openLink:",
      "../apoio/entrar.yaml",
      'ACAO: "conferir"',
      "parseInt(output.INDICADOS, 10) > parseInt(output.INDICADOS_ANTES, 10)",
      "../scripts/fila_pela_api.js",
      "conjunta/prof_finalizar.yaml",
      'id: "convite-avaliar"',
    ].map((p) => etapa.indexOf(p));
    passos.forEach((p) => expect(p).toBeGreaterThan(-1));
    passos.slice(1).forEach((p, i) => expect(p).toBeGreaterThan(passos[i]));
  });

  it("o link vai no esquema do app, que o Client lê no aparelho", () => {
    const script = ler(".maestro/scripts/link_do_profissional.js");
    expect(script).toContain('"vupth://i/" + codigo[1] + "?c=" + campanha.id');
    expect(script).toContain('"/campaigns/" + campanha.id + "/join"');
    expect(ler("app.json")).toMatch(/"scheme": "vupth"/);
    expect(ler("src/hooks/useIndicacao.ts")).toContain("Linking.addEventListener('url'");
  });

  it("os subfluxos e ids usados existem", () => {
    expect(fs.existsSync(path.join(ROOT, ".maestro/apoio/entrar.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, ".maestro/apoio/abrir_partner.yaml"))).toBe(true);
    expect(ler(".maestro/etapas/22_conjunta_finalizar_e_avaliar.yaml")).toContain('id: "convite-avaliar"');
  });
});
