import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// 🔴 Andre, 25/09: o pre-push parou no expo-doctor — "Node v18.19.1, requer
// >=20.19.4". O hook e `sh` e usa o node do PATH, que no terminal dele e o do
// sistema; o Node 22 esta no nvm, carregado so sob demanda pelo shell. O
// `.githooks/node-certo.sh` troca para o do nvm quando o do PATH e antigo.
//
// Aqui os "nodes" sao scripts falsos que so respondem `-v`.

const ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(ROOT, ".githooks/node-certo.sh");

function nodeFalso(dir: string, versao: string) {
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, "node");
  fs.writeFileSync(f, `#!/bin/sh\necho ${versao}\n`);
  fs.chmodSync(f, 0o755);
}

function rodar(env: Record<string, string>): { saida: string; ok: boolean } {
  try {
    const saida = execFileSync("sh", ["-c", `. "${SCRIPT}" && node -v`], {
      env: {
        PATH: `${env.PATH}:/usr/bin:/bin`,
        HOME: env.HOME ?? "/nao-existe",
        NVM_DIR: env.NVM_DIR ?? "",
        NODE_ENV: "test",
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { saida: saida.trim().split("\n").pop()!, ok: true };
  } catch {
    return { saida: "", ok: false };
  }
}

describe("node do pre-push", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "node-certo-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("node do PATH ja serve: fica ele", () => {
    nodeFalso(path.join(tmp, "sistema"), "v22.3.0");
    expect(rodar({ PATH: path.join(tmp, "sistema") })).toEqual({ saida: "v22.3.0", ok: true });
  });

  it("node do PATH antigo: usa o mais novo do nvm", () => {
    nodeFalso(path.join(tmp, "sistema"), "v18.19.1");
    nodeFalso(path.join(tmp, "nvm/versions/node/v20.19.4/bin"), "v20.19.4");
    nodeFalso(path.join(tmp, "nvm/versions/node/v22.23.1/bin"), "v22.23.1");
    const r = rodar({ PATH: path.join(tmp, "sistema"), NVM_DIR: path.join(tmp, "nvm") });
    expect(r).toEqual({ saida: "v22.23.1", ok: true });
  });

  it("sem NVM_DIR, procura em ~/.nvm", () => {
    nodeFalso(path.join(tmp, "sistema"), "v18.19.1");
    nodeFalso(path.join(tmp, "casa/.nvm/versions/node/v22.23.1/bin"), "v22.23.1");
    const r = rodar({ PATH: path.join(tmp, "sistema"), HOME: path.join(tmp, "casa") });
    expect(r.saida).toBe("v22.23.1");
  });

  it("20.19.3 ainda e antigo (o minimo e 20.19.4)", () => {
    nodeFalso(path.join(tmp, "sistema"), "v20.19.3");
    nodeFalso(path.join(tmp, "nvm/versions/node/v22.23.1/bin"), "v22.23.1");
    expect(rodar({ PATH: path.join(tmp, "sistema"), NVM_DIR: path.join(tmp, "nvm") }).saida).toBe("v22.23.1");
  });

  it("antigo e nenhum node bom no nvm: o hook para, com aviso", () => {
    nodeFalso(path.join(tmp, "sistema"), "v18.19.1");
    nodeFalso(path.join(tmp, "nvm/versions/node/v18.20.0/bin"), "v18.20.0");
    expect(rodar({ PATH: path.join(tmp, "sistema"), NVM_DIR: path.join(tmp, "nvm") }).ok).toBe(false);
  });
});

describe("versao do Node declarada no projeto", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

  it("package.json exige >=20.19.4 (o minimo do Expo 54)", () => {
    expect(pkg.engines?.node).toBe(">=20.19.4");
  });

  it(".nvmrc aponta o 22, o mesmo do workflow de OTA", () => {
    expect(fs.readFileSync(path.join(ROOT, ".nvmrc"), "utf8").trim()).toBe("22");
  });

  it("o pre-push carrega o node-certo antes de qualquer passo", () => {
    const hook = fs.readFileSync(path.join(ROOT, ".githooks/pre-push"), "utf8");
    const carga = hook.indexOf("node-certo.sh");
    expect(carga).toBeGreaterThan(-1);
    expect(carga).toBeLessThan(hook.indexOf("npm run --silent lint"));
  });
});
