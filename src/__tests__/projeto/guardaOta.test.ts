import fs from 'fs';
import path from 'path';

// ota-so-compativel (DEC-152): o guarda do OTA. Muda pacote nativo: bloqueia. So JS: passa. Sem base ou sem comparar: bloqueia.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { decidir, diferencas, mapaDeFontes } = require('../../../tools/guardaOta.js');

const RAIZ = path.resolve(__dirname, '../../..');

const fontes = (extra: Record<string, string> = {}) => [
  { type: 'file', filePath: 'node_modules/expo-camera/package.json', hash: 'aaa' },
  { type: 'dir', filePath: 'node_modules/expo-notifications/android', hash: 'bbb' },
  { type: 'contents', id: 'expoConfig', hash: 'ccc' },
  ...Object.entries(extra).map(([filePath, hash]) => ({ type: 'file', filePath, hash })),
];
const base = (extra?: Record<string, string>) => ({ hash: 'H1', fontes: mapaDeFontes(fontes(extra)) });

describe('guardaOta.decidir', () => {
  it('so JS mudou (mesmo hash): pode publicar', () => {
    const r = decidir(base(), { hash: 'H1', sources: fontes() });
    expect(r).toMatchObject({ ok: true, codigo: 0 });
  });

  it('pacote nativo NOVO: bloqueia e diz qual', () => {
    const r = decidir(base(), { hash: 'H2', sources: fontes({ 'node_modules/react-native-mmkv/package.json': 'ddd' }) });
    expect(r.ok).toBe(false);
    expect(r.codigo).toBe(1);
    expect(r.mudancas).toEqual(['novo: file:node_modules/react-native-mmkv/package.json']);
  });

  it('pacote nativo que mudou de versao ou plugin que saiu: bloqueia', () => {
    const atual = fontes().map((s) => (s.filePath === 'node_modules/expo-camera/package.json' ? { ...s, hash: 'zzz' } : s)).filter((s) => s.type !== 'dir');
    const r = decidir(base(), { hash: 'H3', sources: atual });
    expect(r.codigo).toBe(1);
    expect(r.mudancas).toEqual(['mudou: file:node_modules/expo-camera/package.json', 'saiu: dir:node_modules/expo-notifications/android']);
  });

  it('falha fechado: sem base ou sem fingerprint, nao publica (codigo 2)', () => {
    expect(decidir(null, { hash: 'H1', sources: fontes() })).toMatchObject({ ok: false, codigo: 2 });
    expect(decidir({ hash: 'H1' }, { hash: 'H1', sources: fontes() })).toMatchObject({ ok: false, codigo: 2 });
    expect(decidir(base(), null)).toMatchObject({ ok: false, codigo: 2 });
    expect(decidir(base(), { hash: 'H1' })).toMatchObject({ ok: false, codigo: 2 });
  });

  it('diferencas ordena e nao repete o que e igual', () => {
    expect(diferencas({ a: '1', b: '2' }, { a: '1', b: '3', c: '4' })).toEqual(['mudou: b', 'novo: c']);
  });
});

describe('guardaOta — ligacao no projeto', () => {
  it('a base do build existe e e valida', () => {
    const b = JSON.parse(fs.readFileSync(path.join(RAIZ, 'fingerprint-do-build.json'), 'utf8'));
    expect(b.hash).toMatch(/^[0-9a-f]{40}$/);
    expect(Object.keys(b.fontes).length).toBeGreaterThan(10);
    expect(b.buildId).toBeTruthy();
  });

  it('o fingerprint ignora o commit carimbado (extra) e o .gitignore, senao o hash mudaria a cada commit', () => {
    const c = fs.readFileSync(path.join(RAIZ, 'fingerprint.config.js'), 'utf8');
    expect(c).toContain('ExpoConfigExtraSection');
    expect(c).toContain('GitIgnore');
  });

  it('o CI roda o guarda antes de qualquer `eas update`', () => {
    const ci = fs.readFileSync(path.join(RAIZ, '.github/workflows/ci.yml'), 'utf8');
    const guarda = ci.indexOf('node tools/guardaOta.js');
    expect(guarda).toBeGreaterThan(-1);
    expect(guarda).toBeLessThan(ci.indexOf('eas update --branch preview'));
    expect(guarda).toBeLessThan(ci.indexOf('eas update --branch production'));
  });

  it('o publicar-ota.sh roda o guarda antes do eas update', () => {
    const sh = fs.readFileSync(path.join(RAIZ, '.maestro/publicar-ota.sh'), 'utf8');
    const guarda = sh.indexOf('tools/guardaOta.js');
    expect(guarda).toBeGreaterThan(-1);
    expect(guarda).toBeLessThan(sh.indexOf('"$EAS" update --branch preview'));
  });
});
