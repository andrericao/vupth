import fs from 'fs';
import os from 'os';
import path from 'path';

import { linkingDoApp, linkingNativo, linkingWeb, DOMINIO_DO_APP } from '../../routes/linking';

// abrir-no-app-se-instalado (DEC-161/180): https://app.vupth.com abre o app de
// produção, se instalado; sem o app, o navegador abre o site. Preview e dev não mudam.

const raiz = path.resolve(__dirname, '../../..');
const appJson = JSON.parse(fs.readFileSync(path.join(raiz, 'app.json'), 'utf8')).expo;
const pacote = fs.readFileSync(path.join(raiz, 'package.json'), 'utf8');
const headers = fs.readFileSync(path.join(raiz, 'public/_headers'), 'utf8');

type Filtro = { autoVerify?: boolean; data: { scheme: string; host: string }[]; category: string[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appConfig = require(path.join(raiz, 'app.config.js')) as (arg: { config: typeof appJson }) => {
  android: { package: string; intentFilters?: Filtro[] };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gerador = require(path.join(raiz, 'tools/gerar-assetlinks.js')) as {
  digitais: (v?: string) => string[];
  gerar: (saida: string, v?: string) => string | null;
  PACOTE: string;
};

function filtros(perfil?: string): Filtro[] {
  const anterior = process.env.EAS_BUILD_PROFILE;
  if (perfil === undefined) delete process.env.EAS_BUILD_PROFILE;
  else process.env.EAS_BUILD_PROFILE = perfil;
  try {
    return appConfig({ config: appJson }).android.intentFilters ?? [];
  } finally {
    if (anterior === undefined) delete process.env.EAS_BUILD_PROFILE;
    else process.env.EAS_BUILD_PROFILE = anterior;
  }
}

const SHA = Array.from({ length: 32 }, () => 'AB').join(':');

describe('o app de produção abre os links de app.vupth.com', () => {
  it.each(['production', 'prod-apk'])('%s: intent filter https com autoVerify', (perfil) => {
    const links = filtros(perfil).filter((f) => f.data.some((d) => d.host === 'app.vupth.com'));
    expect(links).toHaveLength(1);
    expect(links[0].autoVerify).toBe(true);
    expect(links[0].data).toEqual([{ scheme: 'https', host: 'app.vupth.com' }]);
    expect(links[0].category).toEqual(expect.arrayContaining(['BROWSABLE', 'DEFAULT']));
  });

  it.each(['development', 'preview', undefined])('%s: sem o app link', (perfil) => {
    expect(filtros(perfil).some((f) => f.data.some((d) => d.host === 'app.vupth.com'))).toBe(false);
  });

  it('o pacote do assetlinks é o de produção', () => {
    expect(gerador.PACOTE).toBe(appJson.android.package);
  });
});

describe('qual linking a navegação usa', () => {
  it('a web sempre usa o da web', () => {
    expect(linkingDoApp('web', 'staging')).toBe(linkingWeb);
    expect(linkingDoApp('web', 'prod')).toBe(linkingWeb);
  });

  it('o aparelho só tem linking na produção, com o domínio do app', () => {
    expect(linkingDoApp('android', 'prod')).toBe(linkingNativo);
    expect(linkingDoApp('android', 'staging')).toBeUndefined();
    expect(linkingDoApp('ios', 'dev')).toBeUndefined();
    expect(linkingNativo.prefixes).toEqual([DOMINIO_DO_APP]);
    expect(DOMINIO_DO_APP).toBe('https://app.vupth.com');
  });

  it('o link da loja abre a loja no aparelho', () => {
    const estado = linkingNativo.getStateFromPath!('/loja/abc', linkingNativo.config as never);
    expect(JSON.stringify(estado)).toContain('"establishmentId":"abc"');
  });
});

describe('o assetlinks.json (SHA-256 por variável, nunca fixo)', () => {
  it('sem a variável, não gera nada', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'assetlinks-'));
    expect(gerador.gerar(pasta, undefined)).toBeNull();
    expect(gerador.gerar(pasta, ' ')).toBeNull();
    expect(fs.existsSync(path.join(pasta, '.well-known'))).toBe(false);
  });

  it('com a variável, gera o arquivo do Android', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'assetlinks-'));
    const arquivo = gerador.gerar(pasta, `${SHA.toLowerCase()}, ${SHA}`)!;
    expect(arquivo).toBe(path.join(pasta, '.well-known', 'assetlinks.json'));
    const [item] = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    expect(item.relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(item.target).toEqual({
      namespace: 'android_app',
      package_name: 'com.vupth.client',
      sha256_cert_fingerprints: [SHA, SHA],
    });
  });

  it('recusa digital malformada', () => {
    expect(() => gerador.digitais('AB:CD')).toThrow('ASSETLINKS_SHA256 invalido');
  });

  // O gerador NAO entra nos scripts do package.json: mexer neles muda o fingerprint e o guarda
  // bloqueia o OTA (guardaOta, 03/11). Ele roda como passo a parte no build web de producao.
  it('o build web serve o arquivo como JSON, sem mexer nos scripts do package.json', () => {
    expect(pacote).not.toContain('gerar-assetlinks');
    expect(headers).toMatch(/\/\.well-known\/assetlinks\.json\s+Content-Type: application\/json/);
  });

  it('nenhuma digital fixa no repositório', () => {
    expect(fs.existsSync(path.join(raiz, 'public/.well-known/assetlinks.json'))).toBe(false);
    expect(fs.readFileSync(path.join(raiz, 'tools/gerar-assetlinks.js'), 'utf8')).not.toMatch(/([0-9A-F]{2}:){31}[0-9A-F]{2}/);
  });
});
