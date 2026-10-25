import fs from "fs";
import path from "path";

// reportar-problema-cancelar-cortado (André, 24/10): o fluxo Maestro 27 confere o Reportar problema com o
// teclado aberto. Aqui, que ele existe, está na bateria e usa os ids que o componente de fato tem.
const ROOT = path.resolve(__dirname, "../../..");
const ler = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");

describe("Maestro 27 — Reportar problema", () => {
  const etapa = ler(".maestro/etapas/27_reportar_problema.yaml");
  const componente = ler("src/components/ReportarProblema.tsx");

  it("a etapa avulsa existe e roda a etapa", () => {
    expect(ler(".maestro/avulsas/27_reportar_problema.yaml")).toMatch(/etapas\/27_reportar_problema\.yaml/);
  });

  it("a bateria roda a 27 por padrão", () => {
    expect(ler(".maestro/bateria.sh")).toMatch(/ETAPAS=\$\{ETAPAS:-"[^"]*\b26 27"\}/);
  });

  it("os ids do fluxo existem no componente; sem Sentry, o fluxo pula (⏭) em vez de falhar", () => {
    for (const id of ["reportar-mensagem", "reportar-enviar", "reportar-cancelar"]) {
      expect(etapa).toContain(`id: "${id}"`);
      expect(componente).toContain(`testID="${id}"`);
    }
    expect(etapa).toMatch(/PULADO-CAMPANHA:/);
  });

  it("confere o Enviar e o Cancelar com o teclado aberto, depois de digitar", () => {
    const digitou = etapa.indexOf("inputText");
    expect(digitou).toBeGreaterThan(-1);
    expect(etapa.indexOf('id: "reportar-cancelar"', digitou)).toBeGreaterThan(digitou);
    expect(etapa.indexOf('id: "reportar-enviar"', digitou)).toBeGreaterThan(digitou);
  });
});
