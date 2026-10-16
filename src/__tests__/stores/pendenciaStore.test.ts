import { usePendenciaStore } from '@stores/pendenciaStore';

describe('pendenciaStore', () => {
  it('avisar, pagar e fechar', () => {
    const itens = [{ attendance_id: 'a1', status: 'PENDING' as const, amount: 1 }];
    usePendenciaStore.getState().avisar(itens);
    expect(usePendenciaStore.getState()).toEqual(expect.objectContaining({ aviso: itens, pagando: null }));
    usePendenciaStore.getState().pagar('a1');
    expect(usePendenciaStore.getState()).toEqual(expect.objectContaining({ aviso: null, pagando: 'a1' }));
    usePendenciaStore.getState().fechar();
    expect(usePendenciaStore.getState()).toEqual(expect.objectContaining({ aviso: null, pagando: null }));
  });
});
