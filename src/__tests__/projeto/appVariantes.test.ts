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
