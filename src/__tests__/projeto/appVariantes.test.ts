import fs from 'fs';
import path from 'path';

// O Android identifica app pelo `package`: dois builds com o mesmo id sao o
// MESMO app, e instalar um DESINSTALA o outro. Era por isso que nao dava pra
// ter o veiculo de teste e o de producao lado a lado no aparelho.
//
// O `app.config.js` resolve dando sufixo as variantes de teste. Este teste
// existe porque o sintoma so aparece no aparelho de quem instala, depois do
// build — nenhum type checker pega um sufixo que sumiu.

const raiz = path.resolve(__dirname, '../../..');
const appJson = JSON.parse(fs.readFileSync(path.join(raiz, 'app.json'), 'utf8')).expo;
const easJson = JSON.parse(fs.readFileSync(path.join(raiz, 'eas.json'), 'utf8'));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const appConfig = require(path.join(raiz, 'app.config.js')) as (arg: {
  config: typeof appJson;
}) => { name: string; android: { package: string }; ios: { bundleIdentifier: string } };

function identidade(perfil?: string) {
  const anterior = process.env.EAS_BUILD_PROFILE;
  if (perfil === undefined) delete process.env.EAS_BUILD_PROFILE;
  else process.env.EAS_BUILD_PROFILE = perfil;
  try {
    const c = appConfig({ config: appJson });
    return { nome: c.name, android: c.android.package, ios: c.ios.bundleIdentifier };
  } finally {
    if (anterior === undefined) delete process.env.EAS_BUILD_PROFILE;
    else process.env.EAS_BUILD_PROFILE = anterior;
  }
}

describe('os tres apps convivem no aparelho', () => {
  it('cada variante de teste tem id proprio, com sufixo', () => {
    expect(identidade('development').android).toBe('com.vupth.client.dev');
    expect(identidade('preview').android).toBe('com.vupth.client.preview');
  });

  it('producao fica com o id LIMPO — publicado na loja, ele nao muda mais', () => {
    expect(identidade('production').android).toBe('com.vupth.client');
    expect(identidade('prod-apk').android).toBe('com.vupth.client');
    // Sem perfil (rodando local) vale o app.json como esta.
    expect(identidade(undefined).android).toBe('com.vupth.client');
  });

  it('nenhum par de veiculos compartilha id — senao um desinstala o outro', () => {
    const ids = ['development', 'preview', 'prod-apk'].map((p) => identidade(p).android);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('o sufixo vale pro iOS tambem', () => {
    expect(identidade('development').ios).toBe('com.vupth.client.dev');
    expect(identidade('preview').ios).toBe('com.vupth.client.preview');
    expect(identidade('prod-apk').ios).toBe('com.vupth.client');
  });

  it('o nome embaixo do icone distingue os tres', () => {
    const nomes = ['development', 'preview', 'prod-apk'].map((p) => identidade(p).nome);
    expect(nomes).toEqual(['VUPTH dev', 'VUPTH preview', appJson.name]);
  });
});

describe('os perfis do eas.json casam com as variantes', () => {
  it('todo perfil que instala em aparelho gera APK — app-bundle nao instala', () => {
    for (const perfil of ['development', 'preview', 'prod-apk']) {
      expect(easJson.build[perfil].android.buildType).toBe('apk');
    }
    // O `production` e o que vai pra loja, e por isso NAO instala em device:
    // e exatamente por isso que o `prod-apk` existe.
    expect(easJson.build.production.android.buildType).toBe('app-bundle');
  });

  it('o prod-apk estende o production sem mudar canal nem backend', () => {
    const prodApk = easJson.build['prod-apk'];
    expect(prodApk.extends).toBe('production');
    expect(prodApk.channel).toBe(easJson.build.production.channel);
    expect(prodApk.env.EXPO_PUBLIC_API_ENV).toBe(easJson.build.production.env.EXPO_PUBLIC_API_ENV);
  });
});

describe('o commit carimbado no bundle (a bateria confere a versão, 03/10)', () => {
  const carimbo = (env: Record<string, string | undefined>) => {
    const antes = { ...process.env };
    Object.assign(process.env, env);
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
    try {
      return (appConfig({ config: appJson }) as unknown as { extra: { commit?: string; eas: unknown } }).extra;
    } finally {
      process.env = antes;
    }
  };

  it('no OTA vem do GITHUB_SHA, e o extra do app.json continua', () => {
    const extra = carimbo({ GITHUB_SHA: 'c65338e7aaaa', EAS_BUILD_GIT_COMMIT_HASH: 'ffff' });
    expect(extra.commit).toBe('c65338e7aaaa');
    expect(extra.eas).toEqual(appJson.extra.eas);
  });

  it('no build do EAS vem do EAS_BUILD_GIT_COMMIT_HASH', () => {
    expect(carimbo({ GITHUB_SHA: undefined, EAS_BUILD_GIT_COMMIT_HASH: 'abcdef12' }).commit).toBe('abcdef12');
  });

  it('local, vem do git', () => {
    const extra = carimbo({ GITHUB_SHA: undefined, EAS_BUILD_GIT_COMMIT_HASH: undefined });
    expect(extra.commit).toMatch(/^[0-9a-f]{40}$/);
  });
});
