import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../../..");

// GUARDA DO PORTAO (aviso do Andre, 27/08 — ele pisou nisto no parceiro).
//
// `expo export --platform web` escreve o site em `dist/`. Nem o tsc nem o
// eslint ignoram essa pasta por conta propria, e as duas falhas que isso causa
// sao das piores possiveis porque NAO APONTAM PRA CAUSA:
//
//   tsc   -> "RangeError: Maximum call stack size exceeded", sem citar arquivo
//   lint  -> milhares de problemas vindos do bundle e, com `--max-warnings 0`,
//            o portao inteiro reprova
//
// Quem gerou o site e depois rodou o portao nao tem como ligar uma coisa a
// outra. Por isso trava aqui: o custo de reaprender e alto demais.
//
// O cliente ainda NAO tem `build:web` — a guarda entra ANTES do problema, nao
// depois. Se alguem adicionar o script, ja esta protegido.
const SAIDAS = ["dist", "web-build"];

describe("saida do build web fica fora do portao", () => {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf8"));

  it.each(SAIDAS)("tsconfig exclui %s", (pasta) => {
    expect(tsconfig.exclude).toEqual(expect.arrayContaining([pasta]));
  });

  const eslintSource = fs.readFileSync(path.join(ROOT, "eslint.config.js"), "utf8");

  it.each(SAIDAS)("eslint ignora %s", (pasta) => {
    expect(eslintSource).toContain(`'${pasta}/'`);
  });

  it("o `exclude` do tsconfig nao apaga o que o portao PRECISA checar", () => {
    // Excluir demais e o outro jeito de quebrar isto: um `exclude` com "src"
    // faria o typecheck passar sem olhar o app.
    for (const proibido of ["src", "App.tsx", "*"]) {
      expect(tsconfig.exclude).not.toContain(proibido);
    }
  });
});
