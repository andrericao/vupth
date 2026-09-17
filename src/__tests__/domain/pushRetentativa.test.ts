import { erroTransitorio, registrarComRetentativa, ESPERAS_REGISTRO_MS } from '../../domain/push';

// O registro do aparelho (POST /devices) sai logo depois do login. Com o Render
// hibernando, ele caía por rede e o aparelho ficava sem push até o próximo
// login (teste do Andre, 15/09). Aqui se fixa quando tentar de novo e quando não.

const deRede = () => Object.assign(new Error('Network Error'), { response: undefined });
const comStatus = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

function montar(respostas: ('ok' | Error)[], cancelado = () => false) {
  const enviar = jest.fn(async () => {
    const r = respostas.shift();
    if (r instanceof Error) throw r;
  });
  const esperar = jest.fn(async () => {});
  const aoTentarDeNovo = jest.fn();
  return { env: { enviar, esperar, cancelado, aoTentarDeNovo }, enviar, esperar, aoTentarDeNovo };
}

describe('erroTransitorio', () => {
  it('sem resposta (rede, timeout) e 5xx valem nova tentativa', () => {
    expect(erroTransitorio(deRede())).toBe(true);
    expect(erroTransitorio(comStatus(502))).toBe(true);
    expect(erroTransitorio(comStatus(503))).toBe(true);
  });

  it('4xx é recusa de verdade — repetir daria a mesma resposta', () => {
    expect(erroTransitorio(comStatus(400))).toBe(false);
    expect(erroTransitorio(comStatus(401))).toBe(false);
    expect(erroTransitorio(comStatus(422))).toBe(false);
  });
});

describe('registrarComRetentativa', () => {
  it('as esperas cobrem os ~50s que o Render leva para acordar', () => {
    const total = ESPERAS_REGISTRO_MS.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(50_000);
    expect(total).toBeLessThan(90_000);
  });

  it('backend frio: falha por rede, espera, e registra na tentativa seguinte', async () => {
    const m = montar([deRede(), deRede(), 'ok']);
    await expect(registrarComRetentativa(m.env)).resolves.toBe('ok');
    expect(m.enviar).toHaveBeenCalledTimes(3);
    expect(m.esperar).toHaveBeenNthCalledWith(1, ESPERAS_REGISTRO_MS[0]);
    expect(m.esperar).toHaveBeenNthCalledWith(2, ESPERAS_REGISTRO_MS[1]);
    expect(m.aoTentarDeNovo.mock.calls.map((c) => c[0])).toEqual([2, 3]);
  });

  it('4xx não se repete: lança na hora', async () => {
    const m = montar([comStatus(400)]);
    await expect(registrarComRetentativa(m.env)).rejects.toThrow('HTTP 400');
    expect(m.enviar).toHaveBeenCalledTimes(1);
    expect(m.esperar).not.toHaveBeenCalled();
  });

  it('esgotadas as tentativas, lança o último erro', async () => {
    const falhas = Array.from({ length: ESPERAS_REGISTRO_MS.length + 1 }, deRede);
    const m = montar(falhas);
    await expect(registrarComRetentativa(m.env)).rejects.toThrow('Network Error');
    expect(m.enviar).toHaveBeenCalledTimes(ESPERAS_REGISTRO_MS.length + 1);
  });

  it('para quando a sessão acaba durante a espera (logout, troca de token)', async () => {
    let fim = false;
    const m = montar([deRede(), 'ok'], () => fim);
    m.esperar.mockImplementation(async () => {
      fim = true;
    });
    await expect(registrarComRetentativa(m.env)).resolves.toBe('cancelado');
    expect(m.enviar).toHaveBeenCalledTimes(1);
  });
});
