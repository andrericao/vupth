import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../..");

// GRAFIA DOS TEXTOS (GUIA_DE_TEXTO.md §6).
//
// "Nao foi possivel sair da fila" chegou ao aparelho sem acento: o texto foi
// escrito num arquivo em que os comentarios sao ASCII (por habito do projeto) e
// a frase de tela herdou o habito. Revisao nenhuma pega isso, porque a frase
// "parece" certa em ASCII. O que pega e proibir, no codigo que roda, cada forma
// errada ja encontrada.
//
// Os comentarios ficam de fora de proposito: eles citam o texto errado para
// explicar o conserto, e proibir a STRING no arquivo inteiro obrigaria a
// reescrever o comentario.

const ERROS: [errado: string, certo: string][] = [
  ["Nao foi possivel", "Não foi possível"],
  ["Voce continua na fila", "Você continua na fila"],
  ["Verifique a conexao", "Verifique a conexão"],
];

function arquivosDeCodigo(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return entrada.name === "__tests__" ? [] : arquivosDeCodigo(caminho);
    return /\.(ts|tsx)$/.test(entrada.name) ? [caminho] : [];
  });
}

function semComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("grafia dos textos que aparecem na tela", () => {
  const codigo = arquivosDeCodigo(SRC).map(
    (arquivo) => [path.relative(SRC, arquivo), semComentarios(fs.readFileSync(arquivo, "utf8"))] as const,
  );

  it("encontra o código a varrer (a varredura não passa por vazio)", () => {
    expect(codigo.length).toBeGreaterThan(50);
  });

  it.each(ERROS)("nenhum texto diz %s (o certo é %s)", (errado) => {
    const achados = codigo.filter(([, texto]) => texto.includes(errado)).map(([arquivo]) => arquivo);
    expect(achados).toEqual([]);
  });
});
