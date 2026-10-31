import type { Query } from '@tanstack/react-query';

import { devePersistir, limparCacheSalvo, persister, PERSISTIVEIS, VALIDADE_MS } from '@services/queryPersist';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// O cache passou a sobreviver entre aberturas do app (13/09): a ultima lista de
// lojas pinta na hora, em vez de skeleton ate a API responder.
//
// ⚠️ O risco de persistir e mostrar dado VELHO como se fosse atual. Para a lista
// de lojas e inofensivo — revalida em seguida. Para a fila e grave: "voce e o
// proximo" de uma fila que ja andou faz o cliente sair de casa na hora errada, e
// a estimativa E o produto. Estes testes travam essa fronteira.

function q(key: unknown[], status: 'success' | 'error' | 'pending' = 'success'): Query {
  return { queryKey: key, state: { status } } as unknown as Query;
}

describe('o que pode sobreviver ao fechamento do app', () => {
  it('a lista de estabelecimentos persiste — e ela que gera o skeleton', () => {
    expect(devePersistir(q(['establishments', -23.5, -46.6]))).toBe(true);
    expect(devePersistir(q(['establishments', null, null]))).toBe(true);
  });

  it('a vitrine paginada da Home persiste (a Home abre por ela)', () => {
    expect(devePersistir(q(['establishments-paginas', null, null]))).toBe(true);
  });

  it('a loja e os servicos do profissional NAO persistem (horario, aberta/fechada e preco nunca vem do cache); a fila da loja tambem nao', () => {
    expect(devePersistir(q(['establishment', 'e1']))).toBe(false);
    expect(devePersistir(q(['service-items', 'p1']))).toBe(false);
    expect(devePersistir(q(['professionals-with-queue', 'e1']))).toBe(false);
    expect(devePersistir(q(['queue-info', 'p1', 'e1']))).toBe(false);
  });

  it('sair da conta apaga o cache salvo, e falhar ao apagar nao quebra', async () => {
    const remover = jest.spyOn(persister, 'removeClient').mockResolvedValue(undefined);
    await limparCacheSalvo();
    expect(remover).toHaveBeenCalledTimes(1);
    remover.mockRejectedValue(new Error('disco'));
    await expect(limparCacheSalvo()).resolves.toBeUndefined();
    remover.mockRestore();
  });

  it('o que diz respeito a FILA nao persiste — dado velho aqui engana o cliente', () => {
    // Estas chaves existem no app. Nenhuma delas pode abrir mostrando o valor de
    // ontem.
    expect(devePersistir(q(['swap-offers-acceptable', 'p1']))).toBe(false);
    expect(devePersistir(q(['my-swap-offers']))).toBe(false);
    expect(devePersistir(q(['queue', 'p1']))).toBe(false);
    expect(devePersistir(q(['attendances']))).toBe(false);
  });

  it('resposta com ERRO nao persiste — o app abriria mostrando falha antiga', () => {
    expect(devePersistir(q(['establishments'], 'error'))).toBe(false);
    expect(devePersistir(q(['establishments'], 'pending'))).toBe(false);
  });

  it('a lista do que persiste e CURTA de proposito', () => {
    // Crescer esta lista e decisao, nao ajuste: cada entrada nova e um dado que
    // pode aparecer velho na cara do cliente. Se este teste quebrar, alguem
    // precisa ter pensado nisso.
    expect([...PERSISTIVEIS]).toEqual(['establishments', 'establishments-paginas']);
  });

  it('chave que nao e texto nao quebra', () => {
    expect(devePersistir(q([42]))).toBe(false);
    expect(devePersistir(q([]))).toBe(false);
  });
});

describe('a validade', () => {
  it('o cache salvo vale um dia — passou disso, abre do zero', () => {
    expect(VALIDADE_MS).toBe(24 * 60 * 60 * 1000);
  });
});
