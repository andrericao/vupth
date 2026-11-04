import fs from "fs";
import path from "path";

// maestro-exclusao-de-conta (CLI-29, DEC-166): o fluxo 28 cria a conta, exclui pelo app e confere que o login
// deixa de existir. Aqui: o fluxo existe, esta na bateria e usa os ids que as telas de fato tem.
const ROOT = path.resolve(__dirname, "../../..");
const ler = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");

describe("Maestro 28 — Exclusão de conta", () => {
  const etapa = ler(".maestro/etapas/28_exclusao_de_conta.yaml");

  it("a etapa avulsa existe, usa conta própria e roda a etapa", () => {
    const avulsa = ler(".maestro/avulsas/28_exclusao_de_conta.yaml");
    expect(avulsa).toMatch(/CONTA: "1"/);
    expect(avulsa).toMatch(/etapas\/28_exclusao_de_conta\.yaml/);
  });

  it("a bateria roda a 28 por padrão", () => {
    expect(ler(".maestro/bateria.sh")).toMatch(/ETAPAS_PADRAO="[^"]*\b27 28\b[^"]*"/);
  });

  it("os ids do fluxo existem nas telas", () => {
    const telas = ler("src/screens/DadosCadastrais.tsx") + ler("src/components/DeleteAccountModal.tsx");
    for (const id of ["delete-account", "delete-account-password", "delete-account-confirm"]) {
      expect(etapa).toContain(`id: "${id}"`);
      expect(telas).toContain(`testID="${id}"`);
    }
  });

  it("depois de excluir, cai no Entrar com o Criar conta (DEC-183)", () => {
    const confirmou = etapa.indexOf('id: "delete-account-confirm"');
    const entrar = etapa.indexOf('id: "primary-login"', confirmou);
    expect(entrar).toBeGreaterThan(confirmou);
    expect(etapa.indexOf('id: "go-signup"', entrar)).toBeGreaterThan(entrar);
    const login = ler("src/screens/Login.tsx");
    expect(login).toContain('testID="primary-login"');
    expect(login).toContain('testID="go-signup"');
  });

  it("depois de excluir, confere o app sem sessão e o login recusado pela API", () => {
    const confirmou = etapa.indexOf('id: "delete-account-confirm"');
    expect(etapa.indexOf("Criar conta grátis", confirmou)).toBeGreaterThan(confirmou);
    expect(etapa.indexOf("login_recusado.js", confirmou)).toBeGreaterThan(confirmou);
    expect(ler(".maestro/scripts/login_recusado.js")).toMatch(/\/auth\/login/);
  });
});

// maestro-excluir-conta (DEC-184): a desativacao tambem leva ao Entrar (DEC-183), com conta propria.
describe("Maestro 29 — Desativação de conta", () => {
  const etapa = ler(".maestro/etapas/29_desativacao_de_conta.yaml");

  it("a etapa avulsa existe, usa conta própria e roda a etapa", () => {
    const avulsa = ler(".maestro/avulsas/29_desativacao_de_conta.yaml");
    expect(avulsa).toMatch(/CONTA: "1"/);
    expect(avulsa).toMatch(/ETAPA: "29"/);
    expect(avulsa).toMatch(/etapas\/29_desativacao_de_conta\.yaml/);
  });

  it("a bateria roda a 29 por padrão, depois da 28", () => {
    expect(ler(".maestro/bateria.sh")).toMatch(/ETAPAS_PADRAO="[^"]*\b28 29\b[^"]*"/);
  });

  it("os ids do fluxo existem nas telas", () => {
    const telas = ler("src/screens/DadosCadastrais.tsx") + ler("src/components/DeleteAccountModal.tsx");
    for (const id of ["deactivate-account", "delete-account-password", "delete-account-confirm"]) {
      expect(etapa).toContain(`id: "${id}"`);
      expect(telas).toContain(`testID="${id}"`);
    }
  });

  it("depois de desativar, cai no Entrar com o Criar conta (DEC-183)", () => {
    const confirmou = etapa.indexOf('id: "delete-account-confirm"');
    const entrar = etapa.indexOf('id: "primary-login"', confirmou);
    expect(entrar).toBeGreaterThan(confirmou);
    expect(etapa.indexOf('id: "go-signup"', entrar)).toBeGreaterThan(entrar);
  });

  it("confere na API que a conta ficou desativada (deactivated=true)", () => {
    expect(etapa).toContain("login_desativada.js");
    const script = ler(".maestro/scripts/login_desativada.js");
    expect(script).toMatch(/\/auth\/login/);
    expect(script).toMatch(/deactivated !== true/);
  });
});

describe("Maestro 16 — Enviar feedback (feedback-no-app)", () => {
  it("a conta abre a caixa do feedback e cancela, com ids que o app tem", () => {
    const etapa = ler(".maestro/etapas/16_conta.yaml");
    const telas = ler("src/screens/Settings.tsx") + ler("src/components/EnviarFeedback.tsx");
    for (const id of ["enviar-feedback", "feedback-texto", "feedback-cancelar"]) {
      expect(etapa).toContain(`id: "${id}"`);
      expect(telas).toContain(`testID="${id}"`);
    }
  });
});
