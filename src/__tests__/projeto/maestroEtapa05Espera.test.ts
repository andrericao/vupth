import fs from "fs";
import path from "path";

// bateria 25/10 01:28 (05.1D): o `repeat while: visible` da espera da tolerância saiu cedo (uma volta só)
// e a faixa "sem custo até" seguia na tela. O laço não pode depender da checagem instantânea do `while`.
const yaml = fs.readFileSync(path.resolve(__dirname, "../../../.maestro/etapas/05_entra_e_sai_com_multa.yaml"), "utf8");

describe("Maestro 05 — a espera da tolerância", () => {
  const lacos = [...yaml.matchAll(/^- repeat:\n((?:    .*\n|\n)+?)(?=^\S)/gm)].map((m) => m[1]);
  const daFaixa = lacos.filter((l) => l.includes("custo"));

  it("os dois laços de espera da faixa existem, com as voltas de 30 s", () => {
    expect(daFaixa).toHaveLength(2);
    expect(daFaixa.map((l) => /times: (\d+)/.exec(l)![1])).toEqual(["40", "30"]);
    for (const l of daFaixa) expect(l).toMatch(/timeout: \$\{30000 \* LENTO\}/);
  });

  it("nenhum laço da faixa usa `while`: a checagem instantânea errava no emulador lento", () => {
    for (const l of daFaixa) expect(l).not.toMatch(/^\s+while:/m);
  });

  it("o primeiro laço confere a volta da faixa (re-render) antes da próxima volta", () => {
    expect(daFaixa[0]).toMatch(/visible:\s*\n\s+text: "\.\*\(sem\|em\)\.\*custo\.\*"/);
  });

  it("depois dos laços, a etapa confere que a faixa saiu", () => {
    expect(yaml).toMatch(/- assertNotVisible:\n\s+text: "\.\*\(sem\|em\)\.\*custo\.\*"\n\s+label: "05\.1D/);
  });
});

// fila-aguardando-do-mockup (CLI-32): "Sair da fila" mora em Opções; o primeiro toque só pede o segundo.
describe("Maestro 05 — Sair da fila em Opções", () => {
  it("abre Opções e toca em more-option-leave-queue (um toque e o duplo); não usa mais o leave-queue solto", () => {
    expect(yaml).not.toMatch(/id: "leave-queue"/);
    expect(yaml).toMatch(/id: "queue-options"/);
    expect(yaml).toMatch(/doubleTapOn:\n\s+id: "more-option-leave-queue"/);
    expect(yaml).toContain("Toque duas vezes seguidas para sair.");
  });
});
