import { comPrazo } from '@utils/comPrazo';

describe('comPrazo', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('devolve o valor quando a promessa responde a tempo', async () => {
    await expect(comPrazo(Promise.resolve(7), 1000)).resolves.toBe(7);
  });

  it('repassa o erro da promessa', async () => {
    await expect(comPrazo(Promise.reject(new Error('x')), 1000)).rejects.toThrow('x');
  });

  it('rejeita quando a promessa nunca responde', async () => {
    const p = comPrazo(new Promise<number>(() => {}), 1000);
    jest.advanceTimersByTime(1000);
    await expect(p).rejects.toThrow('prazo de 1000 ms esgotado');
  });
});
