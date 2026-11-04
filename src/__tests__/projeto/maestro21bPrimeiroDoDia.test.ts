import fs from "fs";
import path from "path";

// maestro-21b-primeiro-do-dia (DEC-185, Backend c38ba90): o "Não chegou" do PRIMEIRO AGENDADO do dia recebe
// 409 LATE_TOO_EARLY até horário + 10 min. A regra só vale para quem tem horário agendado (desiredTime): o cliente
// da 21b entra na FILA pela API (POST /attendances, sem horário), então o Partner marca o atraso como sempre.
// Se a 21b passar a agendar, ela cai na trava e precisa de outro agendado antes.
const ROOT = path.resolve(__dirname, "../../..");
const ler = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");

describe("Maestro 21b — fora da trava do primeiro agendado do dia", () => {
  it("a 21b entra na fila pela API (não agenda)", () => {
    const avulsa = ler(".maestro/avulsas/21b_conjunta_atraso.yaml");
    expect(avulsa).toContain("../scripts/fila_pela_api.js");
    expect(avulsa).toMatch(/ACAO: "entrar"/);
    expect(avulsa).not.toMatch(/desiredTime|agendar/i);
  });

  it("o entrar da fila_pela_api é POST /attendances sem horário agendado", () => {
    const script = ler(".maestro/scripts/fila_pela_api.js");
    const entrar = script.slice(script.indexOf('if (ACAO === "entrar")'), script.indexOf('} else if (ACAO === "sair")'));
    expect(entrar).toContain('pedir("POST", "/attendances"');
    expect(entrar).not.toMatch(/desiredTime|intentions/);
  });
});
