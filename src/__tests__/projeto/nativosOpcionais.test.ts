import fs from 'fs';
import path from 'path';

// log-de-falha-na-abertura (DEC-152): modulo nativo opcional so entra por require protegido. Estes sao os que o app
// ja carrega assim; um `import` estatico deles reprova. Modulo novo opcional: entra na lista e usa carregarNativoOpcional.
const OPCIONAIS = ['expo-location', 'expo-clipboard', '@sentry/react-native'];
const RAIZ = path.resolve(__dirname, '../..');

function arquivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

describe('modulos nativos opcionais', () => {
  it.each(OPCIONAIS)('%s so entra por require protegido (nada de import estatico)', (modulo) => {
    const achados: string[] = [];
    for (const f of arquivos(RAIZ)) {
      const fonte = fs.readFileSync(f, 'utf8');
      const re = new RegExp(`^\\s*import\\s+(?!type\\b)[^;]*?from\\s+['"]${modulo.replace('/', '\\/')}(?:/[^'"]*)?['"]`, 'm');
      if (re.test(fonte)) achados.push(path.relative(RAIZ, f));
    }
    expect(achados).toEqual([]);
  });
});
