import { spawnSync, execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// maestro-publica-o-ota (André, 22/10): a bateria publica o OTA da dev antes de começar, sem o
// André. O script para na primeira falha e diz o que houve. Aqui o `eas` é um script falso e o
// repositório é de mentira (com uma origin local).

const ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(ROOT, ".maestro/publicar-ota.sh");

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd, stdio: "pipe" }).toString().trim();

function preparar({ comEas = true, easFalha = false, atrasado = false, guarda = 0 as number | null } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ota-"));
  const origin = path.join(base, "origin.git");
  const repo = path.join(base, "repo");
  fs.mkdirSync(origin);
  git(origin, "init", "--bare", "-q", "-b", "dev");
  fs.mkdirSync(path.join(repo, ".maestro"), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(repo, ".maestro/publicar-ota.sh"));
  git(repo, "init", "-q", "-b", "dev");
  git(repo, "remote", "add", "origin", origin);
  fs.writeFileSync(path.join(repo, "a.txt"), "1");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "feat: primeiro");
  git(repo, "push", "-q", "origin", "dev");
  if (atrasado) {
    fs.writeFileSync(path.join(repo, "a.txt"), "2");
    git(repo, "commit", "-aq", "-m", "feat: so local");
  }
  const bin = path.join(base, "bin");
  fs.mkdirSync(bin);
  const chamadas = path.join(base, "chamadas.txt");
  if (comEas) {
    fs.writeFileSync(
      path.join(bin, "eas"),
      `#!/bin/sh\necho "$EXPO_PUBLIC_API_ENV $@" >> "${chamadas}"\n[ "$1" = "update" ] && [ "${easFalha ? 1 : 0}" = "1" ] && exit 1\nexit 0\n`,
    );
    fs.chmodSync(path.join(bin, "eas"), 0o755);
  }
  // ota-so-compativel (DEC-152): o guarda roda antes do eas update. Aqui o `node` e falso e sai com o codigo pedido
  // (null = sem node no PATH: falha fechado).
  if (guarda !== null) {
    fs.writeFileSync(path.join(bin, "node"), `#!/bin/sh\necho "guarda $@" >> "${chamadas}"\nexit ${guarda}\n`);
    fs.chmodSync(path.join(bin, "node"), 0o755);
  }
  return { repo, bin, chamadas };
}

function rodar(p: ReturnType<typeof preparar>) {
  const r = spawnSync("bash", [path.join(p.repo, ".maestro/publicar-ota.sh")], {
    // sem o nvm do usuário: só o eas falso (ou nenhum) e o sistema
    env: { PATH: `${p.bin}:/usr/bin:/bin`, HOME: "/nao-existe", EXPO_TOKEN: "token", NODE_ENV: "test" },
    encoding: "utf8",
  });
  return { codigo: r.status, saida: `${r.stdout}${r.stderr}` };
}

describe("publicar-ota.sh", () => {
  it("publica o OTA da dev no canal preview, com o mesmo comando do CI, e diz que a bateria confere o commit", () => {
    const p = preparar();
    const r = rodar(p);
    expect(r.codigo).toBe(0);
    expect(r.saida).toMatch(/OTA publicado/);
    const chamadas = fs.readFileSync(p.chamadas, "utf8");
    expect(chamadas).toMatch(/^staging update --branch preview --message bateria Maestro · [0-9a-f]+ feat: primeiro --non-interactive$/m);
  });

  it("o guarda do OTA bloqueia (o nativo mudou): nao publica e manda fazer build", () => {
    const p = preparar({ guarda: 1 });
    const r = rodar(p);
    expect(r.codigo).toBe(5);
    expect(r.saida).toMatch(/guarda do OTA bloqueou/);
    expect(fs.readFileSync(p.chamadas, "utf8")).not.toMatch(/update/);
  });

  it("sem como rodar o guarda (sem node): falha fechado, nao publica", () => {
    const p = preparar({ guarda: null });
    const r = rodar(p);
    expect(r.codigo).toBe(5);
    expect(fs.readFileSync(p.chamadas, "utf8")).not.toMatch(/update/);
  });

  it("sem o eas-cli: para e manda publicar à mão (nunca instala)", () => {
    const r = rodar(preparar({ comEas: false }));
    expect(r.codigo).toBe(2);
    expect(r.saida).toMatch(/eas-cli nao esta instalado/);
  });

  it("a pasta fora da origin/dev: para e pede o push ou o pull", () => {
    const p = preparar({ atrasado: true });
    const r = rodar(p);
    expect(r.codigo).toBe(3);
    expect(r.saida).toMatch(/nao esta no commit da origin\/dev/);
    expect(fs.existsSync(p.chamadas)).toBe(false);
  });

  it("o EAS Update falha: diz que a bateria não vai rodar e devolve o erro", () => {
    const r = rodar(preparar({ easFalha: true }));
    expect(r.codigo).toBe(1);
    expect(r.saida).toMatch(/EAS Update falhou\. A bateria NAO vai rodar/);
  });
});

describe("a bateria e o setup aceitam --publicar-ota", () => {
  const ler = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");

  it("a bateria repassa a opção ao setup e o setup para se o OTA não sair", () => {
    expect(ler(".maestro/bateria.sh")).toMatch(/--publicar-ota\) PUBLICAR_OTA="--publicar-ota"/);
    expect(ler(".maestro/bateria.sh")).toMatch(/setup\.sh" \$PUBLICAR_OTA \|\| exit 1/);
    expect(ler(".maestro/setup.sh")).toMatch(/publicar-ota\.sh" \|\| \{ echo "ERRO: OTA nao publicado/);
  });

  it("o comando manual de uma linha está no topo do script", () => {
    expect(ler(".maestro/publicar-ota.sh")).toMatch(/EXPO_PUBLIC_API_ENV=staging eas update --branch preview --message "bateria" --non-interactive/);
  });
});
