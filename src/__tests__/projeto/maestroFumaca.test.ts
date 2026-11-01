import fs from "fs";
import path from "path";

// teste-do-essencial (DEC-157): logar, marcar um serviço e pagar. O Maestro 00b roda primeiro e, se falha, a
// bateria para. Aqui: o fluxo existe, está ligado na bateria e usa ids que o app de fato tem.
const ROOT = path.resolve(__dirname, "../../..");
const ler = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");
const fontes = (dir: string): string =>
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .map((e) => (e.name === "__tests__" ? "" : e.isDirectory() ? fontes(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? ler(`${dir}/${e.name}`) : ""))
    .join("\n");

describe("Maestro 00b — teste de fumaça", () => {
  const etapa = ler(".maestro/etapas/00b_fumaca.yaml");
  const bateria = ler(".maestro/bateria.sh");

  it("a avulsa loga, abre a loja, escolhe o serviço e roda a etapa", () => {
    const avulsa = ler(".maestro/avulsas/00b_fumaca.yaml");
    expect(avulsa).toMatch(/etapas\/09_login\.yaml/);
    expect(avulsa).toMatch(/apoio\/abrir_a_loja\.yaml/);
    expect(avulsa).toMatch(/apoio\/escolher_servico\.yaml/);
    expect(avulsa).toMatch(/etapas\/00b_fumaca\.yaml/);
  });

  it("roda primeiro, sempre, e a falha para a bateria", () => {
    expect(bateria).toMatch(/ETAPAS_PADRAO="00b 01 /);
    expect(bateria).toMatch(/\[ "\$n" != "00b" \] && aprovada/);
    expect(bateria).toMatch(/if \[ "\$n" = "00b" \]; then[\s\S]*?break/);
    expect(bateria).toMatch(/CONJUNTAS="00b /);
  });

  it("tem fases: versão, fumaça com teto de 5 min, e só depois a regressão", () => {
    expect(bateria).toMatch(/--fumaca\) FASE="fumaca"/);
    expect(bateria).toMatch(/--regressao\) FASE="regressao"/);
    expect(bateria).toMatch(/FUMACA_PRAZO="\$\{FUMACA_PRAZO:-300\}"/);
    expect(bateria).toMatch(/case "\$nome" in 00b_\*\) prazo="\$FUMACA_PRAZO"/);
    expect(bateria).toMatch(/A regressao so roda depois da fumaca verde neste commit/);
    expect(ler(".maestro/avulsas/00b_fumaca.yaml")).toMatch(/tags:\s*\n\s*- smoke/);
  });

  it("pergunta se verifica a atualização; não, segue direto aos testes", () => {
    expect(bateria).toMatch(/Verificar a atualização do app antes dos testes\?/);
    expect(bateria).toMatch(/--sem-atualizacao\) ATUALIZAR="n"/);
    expect(bateria).toMatch(/ATUALIZAR" = "n" \]; then\s+VERSAO_OK=2/);
  });

  it("diz que não prova o dinheiro nem o Pix do gateway", () => {
    expect(etapa).toMatch(/NÃO prova: dinheiro real nem o Pix do Asaas/);
  });

  it("usa só ids que o app tem", () => {
    const app = fontes("src");
    for (const id of ["primary-queue", "queue-position", "pix-do-atendimento", "pagamento-fechar", "pagamentos-pendentes", "pix-ja-paguei", "pix-ok"]) {
      expect(etapa).toContain(`"${id}"`);
      expect(app).toContain(id);
    }
  });
});
