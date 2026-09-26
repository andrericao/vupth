import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// Print do Andre (26/09): em Dados pessoais o "Salvar" cobria o "Outro". Os
// botões de gênero recebiam `h="$10"` (40) e o nosso Button tem altura mínima
// de 54: desenhado com 54, reservado com 40. Com quatro opções a diferença
// somou quase um botão. Altura fixa no Button não pode voltar.

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : arquivos(p);
    return n.endsWith('.tsx') ? [p] : [];
  });
}

describe('o Button do app não recebe altura fixa', () => {
  it('nenhum <Button ... h= / height= > em src/', () => {
    const achados: string[] = [];
    for (const f of arquivos(join(__dirname, '../..'))) {
      const s = readFileSync(f, 'utf8');
      if (!s.includes('from "@components/Button"')) continue;
      for (const m of s.matchAll(/<Button\b([\s\S]*?)\/>/g)) {
        if (/\s(h|height)=/.test(m[1])) achados.push(f);
      }
    }
    expect(achados).toEqual([]);
  });
});
