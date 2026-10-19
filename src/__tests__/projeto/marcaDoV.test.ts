import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// icone-de-notificacao (CLI, 18/10): o V estilizado do Partner (f4b806a) no
// icone da notificacao e no favicon. O plugin e NATIVO: so vale com build novo.

const raiz = join(__dirname, '../../..');
const app = JSON.parse(readFileSync(join(raiz, 'app.json'), 'utf-8')).expo;

describe('o V estilizado nas notificações e no favicon', () => {
  it('o plugin do expo-notifications aponta o ícone e a cor, e o arquivo existe', () => {
    const plugin = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-notifications');
    expect(plugin?.[1]).toEqual({ icon: './assets/marca/v-notificacao-96.png', color: '#163300' });
    expect(existsSync(join(raiz, 'assets/marca/v-notificacao-96.png'))).toBe(true);
  });

  it('o favicon da web é o do V e os arquivos públicos estão em public/', () => {
    expect(app.web.favicon).toBe('./assets/marca/favicon-512.png');
    expect(existsSync(join(raiz, 'assets/marca/favicon-512.png'))).toBe(true);
    for (const f of ['favicon.svg', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon-180.png']) {
      expect(existsSync(join(raiz, 'public', f))).toBe(true);
    }
  });
});
