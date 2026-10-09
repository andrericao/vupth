// cobertura-98 (08/10): o main da catraca — le o resumo, sobe o minimo e grava.
import fs from 'fs';
import os from 'os';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { main } = require('../../../tools/catraca-cobertura');

function pasta(resumo?: object) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'catraca-'));
  fs.writeFileSync(
    path.join(raiz, 'package.json'),
    JSON.stringify({ jest: { coverageThreshold: { global: { lines: 80, branches: 70, functions: 70, statements: 80 } } } }),
  );
  if (resumo) {
    fs.mkdirSync(path.join(raiz, 'coverage'));
    fs.writeFileSync(path.join(raiz, 'coverage', 'coverage-summary.json'), JSON.stringify({ total: resumo }));
  }
  return raiz;
}

describe('catraca — main', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('grava o novo mínimo no package.json', () => {
    const raiz = pasta({
      lines: { pct: 91.2 },
      branches: { pct: 60 },
      functions: { pct: 75.9 },
      statements: { pct: 85 },
    });
    main(raiz);
    const pkg = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
    expect(pkg.jest.coverageThreshold.global).toEqual({ lines: 91, branches: 70, functions: 75, statements: 85 });
  });

  it('sem o resumo, para com erro', () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => {});
    const sair = jest.spyOn(process, 'exit').mockImplementation(((c: number) => {
      throw new Error(`exit ${c}`);
    }) as never);
    expect(() => main(pasta())).toThrow('exit 1');
    expect(erro).toHaveBeenCalled();
    expect(sair).toHaveBeenCalledWith(1);
  });

  it('package.json sem o threshold começa do zero', () => {
    const raiz = pasta({ lines: { pct: 50 }, branches: { pct: 50 }, functions: { pct: 50 }, statements: { pct: 50 } });
    fs.writeFileSync(path.join(raiz, 'package.json'), JSON.stringify({ jest: {} }));
    main(raiz);
    const pkg = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
    expect(pkg.jest.coverageThreshold.global.lines).toBe(50);
  });
});
