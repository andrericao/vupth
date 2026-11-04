import { ambienteBate, conferirAmbienteDaApi } from '@services/ambienteDaApi';

// checar-ambiente-da-api (F20, DEC-184): o build de produção não segue se a API disser staging (e o inverso).
// GET /actuator/info (público, Backend 92661c7) traz env: production | staging | local.

function resposta(corpo: unknown, ok = true) {
  return jest.fn().mockResolvedValue({ ok, json: async () => corpo }) as unknown as typeof fetch;
}

describe('ambienteBate', () => {
  it('produção recusa a API que diz staging', () => {
    expect(ambienteBate('prod', 'staging')).toBe(false);
    expect(ambienteBate('prod', 'production')).toBe(true);
  });

  it('o teste (staging) recusa a API que diz production', () => {
    expect(ambienteBate('staging', 'production')).toBe(false);
    expect(ambienteBate('staging', 'staging')).toBe(true);
  });

  it('sem o campo, ou com valor desconhecido, não recusa', () => {
    expect(ambienteBate('prod', undefined)).toBe(true);
    expect(ambienteBate('prod', 'local')).toBe(true);
    expect(ambienteBate('staging', null)).toBe(true);
  });

  it('a máquina (dev) nunca recusa', () => {
    expect(ambienteBate('dev', 'production')).toBe(true);
    expect(ambienteBate('dev', 'staging')).toBe(true);
  });
});

describe('conferirAmbienteDaApi', () => {
  const base = { baseUrl: 'http://api.test', timeoutMs: 50 };

  it('produção com a API dizendo staging: errado (a recusa)', async () => {
    const fetchFn = resposta({ env: 'staging' });
    expect(await conferirAmbienteDaApi({ ...base, apiEnv: 'prod', fetchFn })).toBe('errado');
    expect(fetchFn).toHaveBeenCalledWith('http://api.test/actuator/info', expect.anything());
  });

  it('produção com a API dizendo production: ok', async () => {
    expect(await conferirAmbienteDaApi({ ...base, apiEnv: 'prod', fetchFn: resposta({ env: 'production' }) })).toBe('ok');
  });

  it('staging com a API dizendo production: errado', async () => {
    expect(await conferirAmbienteDaApi({ ...base, apiEnv: 'staging', fetchFn: resposta({ env: 'production' }) })).toBe('errado');
  });

  it('dev não chama a API', async () => {
    const fetchFn = resposta({ env: 'production' });
    expect(await conferirAmbienteDaApi({ ...base, apiEnv: 'dev', fetchFn })).toBe('ok');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('sem resposta boa não trava: HTTP de erro, JSON quebrado ou rede caída', async () => {
    expect(await conferirAmbienteDaApi({ ...base, apiEnv: 'prod', fetchFn: resposta({ env: 'staging' }, false) })).toBe('ok');
    const quebrado = jest.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('x'); } }) as unknown as typeof fetch;
    expect(await conferirAmbienteDaApi({ ...base, apiEnv: 'prod', fetchFn: quebrado })).toBe('ok');
    const caiu = jest.fn().mockRejectedValue(new Error('rede')) as unknown as typeof fetch;
    expect(await conferirAmbienteDaApi({ ...base, apiEnv: 'prod', fetchFn: caiu })).toBe('ok');
  });

  it('o padrão do jest é a máquina (dev): não cutuca a API', async () => {
    const fetchFn = resposta({ env: 'staging' });
    expect(await conferirAmbienteDaApi({ fetchFn })).toBe('ok');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
