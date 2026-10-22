import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { formatarReais } from '@utils/formatarReais';

// valor-em-reais-padronizado (André, 22/10): "R$ 53,90" em toda tela, dica, aviso
// e botão — símbolo, espaço, vírgula nos centavos, ponto no milhar, duas casas.
// Uma função só (`formatarReais`); este teste falha se alguém montar o valor à
// mão de novo ("R$ 53.90", "R$ ${x.toFixed(2)}").

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : arquivos(p);
    return /\.tsx?$/.test(n) ? [p] : [];
  });
}

const RAIZ = join(__dirname, '../..');
const DA_FUNCAO = join(RAIZ, 'utils/formatarReais.ts');

describe('formatarReais', () => {
  it('símbolo, espaço, vírgula nos centavos, ponto no milhar, sempre duas casas', () => {
    expect(formatarReais(53.9)).toBe('R$ 53,90');
    expect(formatarReais(27.9)).toBe('R$ 27,90');
    expect(formatarReais(3)).toBe('R$ 3,00');
    expect(formatarReais(0)).toBe('R$ 0,00');
    expect(formatarReais(1234.56)).toBe('R$ 1.234,56');
    expect(formatarReais(1234567.8)).toBe('R$ 1.234.567,80');
    expect(formatarReais(-5)).toBe('-R$ 5,00');
  });

  it('valor inválido vira R$ 0,00, não "R$ NaN"', () => {
    expect(formatarReais(NaN)).toBe('R$ 0,00');
    expect(formatarReais(Infinity)).toBe('R$ 0,00');
  });
});

describe('o valor em reais é montado só pela formatarReais', () => {
  it('nenhum arquivo de src/ escreve "R$ 53.90" nem "R$ ${...toFixed(2)}"', () => {
    const achados = arquivos(RAIZ)
      .filter((f) => f !== DA_FUNCAO)
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .flatMap((linha, i) =>
            /R\$\s?\d+\.\d{2}/.test(linha) || (/R\$/.test(linha) && /toFixed\(2\)/.test(linha))
              ? [`${f}:${i + 1}`]
              : [],
          ),
      );
    expect(achados).toEqual([]);
  });
});
