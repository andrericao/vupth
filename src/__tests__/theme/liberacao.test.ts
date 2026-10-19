// O escuro so entra na escolha quando as telas dele estiverem prontas
// (src/theme/liberacao.ts). O padrao e FECHADO: so a variavel de ambiente abre.
function ler(valor: string | undefined): boolean {
  const antes = process.env.EXPO_PUBLIC_TEMA_ESCURO;
  if (valor === undefined) delete process.env.EXPO_PUBLIC_TEMA_ESCURO;
  else process.env.EXPO_PUBLIC_TEMA_ESCURO = valor;
  try {
    let liberado = false;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      liberado = require('../../theme/liberacao').ESCURO_LIBERADO;
    });
    return liberado;
  } finally {
    if (antes === undefined) delete process.env.EXPO_PUBLIC_TEMA_ESCURO;
    else process.env.EXPO_PUBLIC_TEMA_ESCURO = antes;
  }
}

describe('liberacao do escuro', () => {
  it('sem a variavel de ambiente o escuro NAO esta liberado', () => {
    expect(ler(undefined)).toBe(false);
  });

  it('so o valor 1 libera', () => {
    expect(ler('1')).toBe(true);
    for (const v of ['0', 'true', '']) expect(ler(v)).toBe(false);
  });
});
