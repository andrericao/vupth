import { resolveApiEnv, CANAL_PARA_ENV } from '@services/apiEnv';

// Regra: em bundle PUBLICADO quem manda e o canal; rodando local, o .env.
// Isto existe porque `EXPO_PUBLIC_API_ENV` e embutido a partir do `.env` da
// maquina de quem publica — quem estivesse com `local` publicaria um app
// apontando pro proprio computador (22/08: ficamos a um comando disso).
describe('de qual backend o bundle fala', () => {
  describe('bundle publicado (tem canal)', () => {
    it('o canal decide, e o .env da maquina de quem publicou e IGNORADO', () => {
      expect(resolveApiEnv('production', 'local')).toBe('prod');
      // So `production` encosta no Railway. `preview` e `development` vao pro
      // Render — testa-se no staging, mostra-se a producao (Andre 06/09).
      // Ate 06/09 o `preview` resolvia 'prod' e o teste em device gravava no
      // banco de PRODUCAO. Ver CANAL_PARA_ENV.
      expect(resolveApiEnv('preview', 'local')).toBe('staging');
      expect(resolveApiEnv('development', 'local')).toBe('staging');
      expect(resolveApiEnv('production', 'dev')).toBe('prod');
    });

    it('canal FORA da tabela nao manda — ai vale o .env', () => {
      // Um canal avulso nao diz nada sobre backend. E o jest-expo devolve
      // `channel: "mock"` quando nao ha OTA nenhum: confiar nisso ligava o
      // portao de readiness no meio dos testes, que rodam no `local`.
      expect(resolveApiEnv('canal-que-alguem-inventou', 'local')).toBe('local');
      expect(resolveApiEnv('mock', 'local')).toBe('local');
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
      expect(resolveApiEnv(null, 'local')).toBe('local');
      expect(resolveApiEnv(undefined, 'prod')).toBe('prod');
      expect(resolveApiEnv(null, 'staging')).toBe('staging');
    });

    it('sem .env, ou com valor que nao existe, fica local', () => {
      expect(resolveApiEnv(null, undefined)).toBe('local');
      expect(resolveApiEnv(null, 'homologacao')).toBe('local');
    });
  });
});
