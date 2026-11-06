import fs from 'fs';
import path from 'path';

// api-no-dominio-nos-perfis (CLI-3, DEC-180): os perfis production e prod-apk (EXPO_PUBLIC_API_ENV=prod) falam com
// https://api.vupth.com, nao com o endereco do Railway. O preview e o development seguem no staging (Render).
const raiz = path.join(__dirname, '../../..');
const api = fs.readFileSync(path.join(raiz, 'src/services/api.ts'), 'utf8');
const eas = JSON.parse(fs.readFileSync(path.join(raiz, 'eas.json'), 'utf8'));
const headers = fs.readFileSync(path.join(raiz, 'public/_headers'), 'utf8');

describe('API no dominio (CLI-3)', () => {
  it('prod aponta para https://api.vupth.com; staging segue no Render', () => {
    expect(api).toMatch(/prod: "https:\/\/api\.vupth\.com",/);
    expect(api).toMatch(/staging: "https:\/\/vupth-backend-ia\.onrender\.com",/);
    expect(api).not.toMatch(/prod: "[^"]*railway/);
  });

  it('production e prod-apk usam prod; preview e development usam staging', () => {
    expect(eas.build.production.env.EXPO_PUBLIC_API_ENV).toBe('prod');
    expect(eas.build['prod-apk'].env.EXPO_PUBLIC_API_ENV).toBe('prod');
    expect(eas.build.preview.env.EXPO_PUBLIC_API_ENV).toBe('staging');
    expect(eas.build.development.env.EXPO_PUBLIC_API_ENV).toBe('staging');
  });

  it('a web pode falar com o dominio (https e wss no connect-src)', () => {
    const csp = headers.split('\n').find((l) => l.includes('Content-Security-Policy:')) ?? '';
    expect(csp).toContain('https://api.vupth.com');
    expect(csp).toContain('wss://api.vupth.com');
  });
});
