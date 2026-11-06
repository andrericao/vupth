import fs from "fs";
import path from "path";

// Limpeza da programacao em fila (orquestrador, 06/11): a bateria desliga o emulador ao sair, passe ou caia.
const ROOT = path.resolve(__dirname, "../../..");
const bateria = fs.readFileSync(path.join(ROOT, ".maestro/bateria.sh"), "utf8");

describe("bateria.sh desliga o emulador", () => {
  const funcao = bateria.slice(bateria.indexOf("desligar_emulador() {"), bateria.indexOf("trap 'desligar_emulador' EXIT"));

  it("só no perfil emulador, só em serial de emulador, e MANTER_EMULADOR=1 deixa ligado", () => {
    expect(funcao).toContain('[ "$PERFIL" = emulador ] || return 0');
    expect(funcao).toContain('"${MANTER_EMULADOR:-}" = 1');
    expect(funcao).toMatch(/case "\$s" in emulator-\*\).*emu kill/);
  });

  it("se o adb não responder, corta o processo do emulador", () => {
    expect(funcao).toContain("pkill -f 'qemu-system'");
  });

  it("a armadilha vem depois da checagem de outra bateria e antes do setup.sh, e o restaurar roda primeiro", () => {
    const outra = bateria.indexOf('OUTRA=$(pgrep -af');
    const armadilha = bateria.indexOf("trap 'desligar_emulador' EXIT");
    const setup = bateria.indexOf('bash "$DIR/setup.sh"');
    const final = bateria.indexOf(`trap 'bash "$DIR/restaurar.sh"; desligar_emulador' EXIT`);
    expect(outra).toBeGreaterThan(-1);
    expect(armadilha).toBeGreaterThan(outra);
    expect(setup).toBeGreaterThan(armadilha);
    expect(final).toBeGreaterThan(setup);
  });
});
