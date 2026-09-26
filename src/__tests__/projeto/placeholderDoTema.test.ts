import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { COR_DO_PLACEHOLDER } from '@utils/corDoPlaceholder';

// A cor do placeholder vive no tema (`brandTextPlaceholder`). Até 25/09 ela
// estava crua em quatro TextInput — trocar o token não chegava a eles.

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : arquivos(p);
    return /\.tsx?$/.test(n) ? [p] : [];
  });
}

describe('placeholder vem do tema', () => {
  it('nenhum placeholderTextColor com cor crua em src/', () => {
    const crus = arquivos(join(__dirname, '../..')).filter((f) =>
      /placeholderTextColor=["'{]\s*["']?#/.test(readFileSync(f, 'utf8')),
    );
    expect(crus).toEqual([]);
  });

  it('o valor é o do token', () => {
    expect(COR_DO_PLACEHOLDER).toBe('#6B706B');
  });
});
