import fs from 'fs';
import path from 'path';

// Teste dentro de uma pasta que o jest ignora NAO FALHA: simplesmente nunca roda, e
// parece cobertura. Aconteceu em 18/10: o `motion.test.tsx` e o `alertaTipado.test.ts`
// foram escritos em `src/__tests__/utils/` (onde mora o `renderWithProviders`, que o
// jest ignora de proposito) e passaram semanas de PR sem executar uma linha. Esta
// guarda le a lista de pastas ignoradas do proprio package.json e reprova um `.test.`
// que esteja dentro de qualquer uma delas.
const RAIZ = path.resolve(__dirname, '../../..');
const pacote = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
const ignoradas: string[] = (pacote.jest.testPathIgnorePatterns as string[])
  .filter((p) => p.startsWith('<rootDir>/') && p.endsWith('/'))
  .map((p) => p.replace('<rootDir>/', ''));

function testesEm(pasta: string): string[] {
  const abs = path.join(RAIZ, pasta);
  if (!fs.existsSync(abs)) return [];
  const achados: string[] = [];
  const andar = (dir: string) => {
    for (const nome of fs.readdirSync(dir)) {
      const caminho = path.join(dir, nome);
      if (fs.statSync(caminho).isDirectory()) andar(caminho);
      else if (/\.test\.(ts|tsx|js)$/.test(nome)) achados.push(path.relative(RAIZ, caminho));
    }
  };
  andar(abs);
  return achados;
}

describe('nenhum teste mora numa pasta que o jest ignora', () => {
  it('a lista de pastas ignoradas existe e a guarda a le', () => {
    expect(ignoradas.length).toBeGreaterThan(0);
    expect(ignoradas).toContain('src/__tests__/utils/');
  });

  it.each(ignoradas)('%s nao tem arquivo .test.', (pasta) => {
    expect(testesEm(pasta)).toEqual([]);
  });
});
