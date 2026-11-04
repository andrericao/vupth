import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// ota-gradual (DEC-174, André 03/11): a produção sobe a 10%; `tools/ota-gradual.sh` promove a 100% ou volta
// atrás. Aqui o `eas` é um script falso que anota as chamadas.
const ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(ROOT, "tools/ota-gradual.sh");

function rodar(acao: string, resposta: string) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ota-gradual-"));
  const bin = path.join(base, "bin");
  fs.mkdirSync(bin);
  const chamadas = path.join(base, "chamadas.txt");
  fs.writeFileSync(
    path.join(bin, "eas"),
    `#!/bin/sh\necho "$@" >> "${chamadas}"\nif [ "$1" = "update:list" ]; then echo '{"currentPage":[{"group":"g-123","message":"feat: algo"}]}'; fi\nexit 0\n`,
    { mode: 0o755 },
  );
  const r = spawnSync("bash", [SCRIPT, acao], {
    input: resposta,
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });
  const feitas = fs.existsSync(chamadas) ? fs.readFileSync(chamadas, "utf8").trim().split("\n") : [];
  return { r, feitas };
}

describe("OTA gradual da produção", () => {
  it("o CI publica a produção a 10% e o preview inteiro, depois do guarda", () => {
    const ci = fs.readFileSync(path.join(ROOT, ".github/workflows/ci.yml"), "utf8");
    expect(ci).toMatch(/eas update --branch production --rollout-percentage 10 /);
    expect(ci).not.toMatch(/eas update --branch preview[^\n]*rollout/);
  });

  it("promover pergunta, mostra o grupo e leva a 100%", () => {
    const { r, feitas } = rodar("promover", "s\n");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("g-123");
    expect(feitas.some((l) => /^update:edit g-123 --rollout-percentage 100 /.test(l))).toBe(true);
  });

  it("sem confirmar, não muda nada", () => {
    const { r, feitas } = rodar("promover", "n\n");
    expect(r.status).toBe(0);
    expect(feitas.some((l) => l.startsWith("update:edit"))).toBe(false);
  });

  it("reverter desfaz o rollout da branch production", () => {
    const { r, feitas } = rodar("reverter", "s\n");
    expect(r.status).toBe(0);
    expect(feitas.some((l) => /^update:revert-update-rollout --branch production /.test(l))).toBe(true);
  });

  it("status só lista; ação desconhecida sai com erro", () => {
    expect(rodar("status", "").feitas[0]).toMatch(/^update:list --branch production /);
    expect(rodar("zzz", "").r.status).toBe(64);
  });
});
