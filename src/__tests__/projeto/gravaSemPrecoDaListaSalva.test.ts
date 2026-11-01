import fs from "fs";
import path from "path";

// abrir-com-lista-salva (DEC-148, condicao 5): preco ou horario mostrados da lista salva nao podem levar a gravar
// valor velho. As gravacoes de entrar na fila, agendar e pedir corte mandam so IDs (e o horario que o cliente
// escolheu); o valor e calculado pelo Backend na hora de gravar.
const ler = (arquivo: string) => fs.readFileSync(path.resolve(__dirname, "../../services", arquivo), "utf8");

function corpoDaInterface(codigo: string, nome: string): string {
  const inicio = codigo.indexOf(`export interface ${nome} {`);
  expect(inicio).toBeGreaterThan(-1);
  return codigo.slice(inicio, codigo.indexOf("\n}", inicio));
}

describe("as gravacoes nao mandam preco", () => {
  it.each([
    ["attendanceService.ts", "CreateAttendanceRequest"],
    ["intentionsService.ts", "CreateIntentionRequest"],
    ["cutRequestService.ts", "CreateCutRequest"],
  ])("%s · %s so tem ids, horario e cupom", (arquivo, interfaceDoPedido) => {
    const corpo = corpoDaInterface(ler(arquivo), interfaceDoPedido);
    const campos = [...corpo.matchAll(/^\s+([A-Za-z_]+)\??:/gm)].map((m) => m[1]);
    expect(campos.length).toBeGreaterThan(0);
    for (const campo of campos) expect(campo).not.toMatch(/price|amount|valor|total|fee/i);
  });
});
