// DEC-7 (Andre, 02/10): o minimo de cobertura so sobe.
// A catraca e JS do Node (tools/), sem tipos: require, nao import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { subirCatraca } = require('../../../tools/catraca-cobertura');

const medido = (l: number, b: number, f: number, s: number) => ({
  lines: { pct: l },
  branches: { pct: b },
  functions: { pct: f },
  statements: { pct: s },
});

describe('catraca da cobertura', () => {
  it('a primeira medicao vira o minimo, arredondada para baixo', () => {
    expect(subirCatraca({}, medido(81.9, 70.2, 77.5, 80.99))).toEqual({
      lines: 81,
      branches: 70,
      functions: 77,
      statements: 80,
    });
  });

  it('sobe o que melhorou e nao desce o que piorou', () => {
    const atual = { lines: 81, branches: 70, functions: 77, statements: 80 };
    expect(subirCatraca(atual, medido(85.4, 65, 77.9, 80.1))).toEqual({
      lines: 85,
      branches: 70,
      functions: 77,
      statements: 80,
    });
  });
});
