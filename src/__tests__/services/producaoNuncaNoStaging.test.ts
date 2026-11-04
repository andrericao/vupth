import { CANAL_PARA_ENV, resolveApiEnv } from '@services/apiEnv';

// F20 (a trava, não a faixa): um build de produção nunca aponta para o staging, nem um de teste para a produção.
// tirar-faixa-de-ambiente (André, 03/11): a faixa AMBIENTE DE TESTE saiu do topo; esta trava fica.
describe('a produção nunca aponta para o staging', () => {
  it('só o canal production vira prod, e vira prod com qualquer .env', () => {
    expect(Object.entries(CANAL_PARA_ENV).filter(([, e]) => e === 'prod').map(([c]) => c)).toEqual(['production']);
    for (const env of ['local', 'dev', 'staging', 'prod', undefined]) {
      expect(resolveApiEnv('production', env)).toBe('prod');
    }
  });

  it('os canais de teste nunca viram prod', () => {
    expect(resolveApiEnv('preview', 'prod')).toBe('staging');
    expect(resolveApiEnv('development', 'prod')).toBe('staging');
  });
});
