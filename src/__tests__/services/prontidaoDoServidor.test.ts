import { esperarServidor, exigirServidor, marcarServidorPronto, useProntidaoStore } from '@services/prontidaoDoServidor';

// abrir-com-lista-salva (DEC-148): so o que grava espera o servidor acordar.

beforeEach(() => {
  marcarServidorPronto();
  useProntidaoStore.setState({ esperando: 0 });
});

describe('prontidaoDoServidor', () => {
  it('por padrao o servidor conta como pronto: nada espera', async () => {
    expect(useProntidaoStore.getState().pronto).toBe(true);
    await expect(esperarServidor()).resolves.toBeUndefined();
    expect(useProntidaoStore.getState().esperando).toBe(0);
  });

  it('exigido e ainda sem resposta: quem grava espera, o contador sobe e o aviso aparece; ao ficar pronto, todos seguem', async () => {
    exigirServidor();
    const seguiu: string[] = [];
    const a = esperarServidor().then(() => seguiu.push('a'));
    const b = esperarServidor().then(() => seguiu.push('b'));
    await Promise.resolve();
    expect(useProntidaoStore.getState().esperando).toBe(2);
    expect(seguiu).toEqual([]);

    marcarServidorPronto();
    await Promise.all([a, b]);
    expect(seguiu).toEqual(['a', 'b']);
    expect(useProntidaoStore.getState()).toMatchObject({ pronto: true, esperando: 0 });
  });

  it('depois de pronto, uma gravacao nova nao espera', async () => {
    exigirServidor();
    marcarServidorPronto();
    await expect(esperarServidor()).resolves.toBeUndefined();
  });
});
