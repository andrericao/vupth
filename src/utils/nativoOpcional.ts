// log-de-falha-na-abertura (DEC-152): modulo nativo OPCIONAL entra por aqui, nunca por `import` no topo do arquivo.
// Um binario sem o modulo faria o import estourar na carga do bundle (tela branca); aqui a falta vira `null` e o
// recurso fica inerte. A regra e testada: ver __tests__/projeto/nativosOpcionais.test.ts.
export function carregarNativoOpcional<T>(requerer: () => T): T | null {
  try {
    return requerer() ?? null;
  } catch {
    return null;
  }
}
