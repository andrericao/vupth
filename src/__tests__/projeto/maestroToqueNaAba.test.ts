import fs from "fs";
import path from "path";

// fumaças 2026-11-05 (161416 e 164830): no emulador lento o toque numa aba passava sem trocar de tela
// (00b.PA no Perfil, 00b.L1 no Início). Os subfluxos conferem a troca e tocam de novo.
const ler = (f: string) => fs.readFileSync(path.resolve(__dirname, "../../..", f), "utf8");

describe("Maestro — o toque na aba confere a troca", () => {
  it.each([
    [".maestro/apoio/entrar.yaml", "Perfil", '"Já tenho conta"'],
    [".maestro/apoio/abrir_a_loja.yaml", "Início", 'id: "busca-home"'],
  ])("%s: toca em %s, espera a tela e, sem ela, toca de novo", (arquivo, aba, alvo) => {
    const f = ler(arquivo);
    const toque = f.indexOf(`text: "${aba}"\n    retryTapIfNoChange: true`);
    const espera = f.indexOf("extendedWaitUntil:", toque);
    const deNovo = f.indexOf("notVisible:", espera);
    expect(toque).toBeGreaterThan(-1);
    expect(espera).toBeGreaterThan(toque);
    expect(f.slice(espera, deNovo)).toContain(alvo);
    expect(deNovo).toBeGreaterThan(espera);
    expect(f.slice(deNovo)).toMatch(new RegExp(`tapOn:\\s*(text: )?"${aba}"`));
  });
});
