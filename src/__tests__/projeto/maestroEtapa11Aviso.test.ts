import fs from "fs";
import path from "path";

// bateria 25/10 01:28 (11.10): o aviso "Sobre o tempo estimado" abre a cada entrada na fila e vem de uma leitura
// assíncrona. A etapa 11 não pode conferir "sumiu" no mesmo instante em que ele pode ainda chegar ou sair.
const yaml = fs.readFileSync(path.resolve(__dirname, "../../../.maestro/etapas/11_reabrir_o_app.yaml"), "utf8");

describe("Maestro 11 — o aviso da estimativa", () => {
  it("espera o aviso chegar, fecha se veio, e só então confere que ele saiu", () => {
    const espera = yaml.indexOf("11.09b");
    const fecha = yaml.indexOf("11.09c");
    const confere = yaml.indexOf("11.10");
    expect(espera).toBeGreaterThan(-1);
    expect(fecha).toBeGreaterThan(espera);
    expect(confere).toBeGreaterThan(fecha);
  });

  it("a conferência final espera o aviso sumir (fade-out) em vez de um assertNotVisible instantâneo", () => {
    expect(yaml).toMatch(/extendedWaitUntil:\n\s+notVisible: "Sobre o tempo estimado"\n\s+timeout: \$\{10000 \* LENTO\}/);
    expect(yaml).not.toMatch(/assertNotVisible:\n\s+text: "Sobre o tempo estimado"/);
  });
});
