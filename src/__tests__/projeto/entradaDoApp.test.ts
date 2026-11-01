import fs from 'fs';
import path from 'path';

// log-de-falha-na-abertura (DEC-152): o index.js e a PORTA DE ENTRADA do app (o `main` do package.json). Se ele nao
// registrar o componente raiz como o nativo espera ("main"), o app nao abre. Estes testes provam que ele faz o mesmo
// que o expo/AppEntry.js que substituiu, com o Sentry antes.
const RAIZ = path.resolve(__dirname, '../../..');

describe('index.js (entrada do app)', () => {
  it('o main do package.json aponta para ele e o arquivo existe', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
    expect(pkg.main).toBe('index.js');
    expect(fs.existsSync(path.join(RAIZ, pkg.main))).toBe(true);
  });

  it('faz o que o AppEntry original fazia: registerRootComponent(App) com o mesmo modulo', () => {
    const entrada = fs.readFileSync(path.join(RAIZ, 'index.js'), 'utf8');
    const original = fs.readFileSync(path.join(RAIZ, 'node_modules/expo/AppEntry.js'), 'utf8');
    // o mesmo import do registerRootComponent e a mesma chamada
    expect(original).toContain("from 'expo/src/launch/registerRootComponent'");
    expect(entrada).toContain('from "expo/src/launch/registerRootComponent"');
    expect(original).toContain('registerRootComponent(App)');
    expect(entrada).toContain('registerRootComponent(App)');
    expect(entrada).toContain('import App from "./App"');
  });

  it('o Sentry vem ANTES do App na ordem dos imports', () => {
    const entrada = fs.readFileSync(path.join(RAIZ, 'index.js'), 'utf8');
    expect(entrada.indexOf('./src/boot/sentryCedo')).toBeGreaterThan(-1);
    expect(entrada.indexOf('./src/boot/sentryCedo')).toBeLessThan(entrada.indexOf('./App'));
  });

  it('executado de verdade, registra o App com o nome "main" que o nativo espera', () => {
    jest.isolateModules(() => {
      const registrar = jest.fn();
      jest.doMock('react-native', () => ({ AppRegistry: { registerComponent: registrar }, Platform: { OS: 'android' } }));
      jest.doMock('../../../App', () => ({ __esModule: true, default: function AppFalso() { return null; } }));
      jest.doMock('../../boot/sentryCedo', () => ({}));
      jest.doMock('expo/src/launch/registerRootComponent', () => ({
        __esModule: true,
        default: (c: unknown) => registrar('main', () => c),
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../../index.js');
      expect(registrar).toHaveBeenCalledTimes(1);
      expect(registrar.mock.calls[0][0]).toBe('main');
    });
  });
});
