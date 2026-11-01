import fs from "fs";
import path from "path";

// teste-do-essencial (DEC-157): logar, marcar um serviço e pagar. O Maestro 28 roda primeiro e, se falha, a
// bateria para. Aqui: o fluxo existe, está ligado na bateria e usa ids que o app de fato tem.
const ROOT = path.resolve(__dirname, "../../..");
const ler = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");
const fontes = (dir: string): string =>
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .map((e) => (e.name === "__tests__" ? "" : e.isDirectory() ? fontes(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? ler(`${dir}/${e.name}`) : ""))
    .join("\n");

describe("Maestro 28 — teste de fumaça", () => {
  const etapa = ler(".maestro/etapas/28_fumaca.yaml");
  const bateria = ler(".maestro/bateria.sh");

  it("a avulsa loga, abre a loja, escolhe o serviço e roda a etapa", () => {
    const avulsa = ler(".maestro/avulsas/28_fumaca.yaml");
    expect(avulsa).toMatch(/etapas\/09_login\.yaml/);
    expect(avulsa).toMatch(/apoio\/abrir_a_loja\.yaml/);
    expect(avulsa).toMatch(/apoio\/escolher_servico\.yaml/);
    expect(avulsa).toMatch(/etapas\/28_fumaca\.yaml/);
  });

  it("roda primeiro, sempre, e a falha para a bateria", () => {
    expect(bateria).toMatch(/ETAPAS=\$\{ETAPAS:-"28 01 /);
    expect(bateria).toMatch(/\[ "\$n" != "28" \] && aprovada/);
    expect(bateria).toMatch(/if \[ "\$n" = "28" \]; then[\s\S]*?break/);
    expect(bateria).toMatch(/CONJUNTAS="[^"]*\b28"/);
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
