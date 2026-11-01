import { dadosFrescos, INICIO_DA_SESSAO } from '@domain/establishment/frescor';

// abrir-com-lista-salva (DEC-148): o dado do disco tem data anterior a esta abertura do app.
describe('frescor dos dados da lista', () => {
  it('buscado antes desta abertura (veio do disco): nao e fresco', () => {
    expect(dadosFrescos(INICIO_DA_SESSAO - 1)).toBe(false);
    expect(dadosFrescos(0)).toBe(false);
  });

  it('buscado nesta abertura: e fresco', () => {
    expect(dadosFrescos(INICIO_DA_SESSAO)).toBe(true);
    expect(dadosFrescos(Date.now() + 1000)).toBe(true);
  });
});
