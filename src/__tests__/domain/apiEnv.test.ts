import { resolveApiEnv, CANAL_PARA_ENV } from '@services/apiEnv';

// Vocabulario (06/09, alinhado ao backend): `dev` = a MAQUINA, `staging` = o
// Render, `prod` = o Railway. Ate entao `dev` era o Render e a maquina se
// chamava `local` — invertido em relacao a quem serve a API.
//
// Regra: em bundle PUBLICADO quem manda e o canal; rodando local, o .env.
// Isto existe porque `EXPO_PUBLIC_API_ENV` e embutido a partir do `.env` da
// maquina de quem publica — quem estivesse com `local` publicaria um app
// apontando pro proprio computador (22/08: ficamos a um comando disso).
describe('de qual backend o bundle fala', () => {
  describe('bundle publicado (tem canal)', () => {
    it('o canal decide, e o .env da maquina de quem publicou e IGNORADO', () => {
      expect(resolveApiEnv('production', 'dev')).toBe('prod');
      // So `production` encosta no Railway. `preview` e `development` vao pro
      // Render — testa-se no staging, mostra-se a producao (Andre 06/09).
      // Ate 06/09 o `preview` resolvia 'prod' e o teste em device gravava no
      // banco de PRODUCAO. Ver CANAL_PARA_ENV.
      expect(resolveApiEnv('preview', 'dev')).toBe('staging');
      expect(resolveApiEnv('development', 'dev')).toBe('staging');
      expect(resolveApiEnv('production', 'staging')).toBe('prod');
    });

    it('canal FORA da tabela nao manda — ai vale o .env', () => {
      // Um canal avulso nao diz nada sobre backend. E o jest-expo devolve
      // `channel: "mock"` quando nao ha OTA nenhum: confiar nisso ligava o
      // portao de readiness no meio dos testes, que rodam no `local`.
      expect(resolveApiEnv('canal-que-alguem-inventou', 'dev')).toBe('dev');
      expect(resolveApiEnv('mock', 'dev')).toBe('dev');
    });

    it('cobre todos os canais declarados no eas.json', () => {
      expect(Object.keys(CANAL_PARA_ENV).sort()).toEqual(['development', 'preview', 'production']);
    });

    it('nenhum canal alem do `production` fala com o Railway', () => {
      // Trava a decisao de 06/09: teste em device nao grava mais em producao.
      const emProd = Object.entries(CANAL_PARA_ENV)
        .filter(([, env]) => env === 'prod')
        .map(([canal]) => canal);
      expect(emProd).toEqual(['production']);
    });
  });

  describe('rodando local (sem canal)', () => {
    it('vale o .env', () => {
      expect(resolveApiEnv(null, 'dev')).toBe('dev');
      expect(resolveApiEnv(undefined, 'prod')).toBe('prod');
      expect(resolveApiEnv(null, 'staging')).toBe('staging');
    });

    it('sem .env, ou com valor que nao existe, fica local', () => {
      expect(resolveApiEnv(null, undefined)).toBe('dev');
      expect(resolveApiEnv(null, 'homologacao')).toBe('dev');
      // `local` era o nome da maquina ate 06/09. Nao e mais aceito: quem
      // tiver um .env antigo cai no fallback, que e a propria maquina.
      expect(resolveApiEnv(null, 'local')).toBe('dev');
    });
  });
});
