import { resolveRating } from '@domain/establishment/rating';

// nota-novo (Andre 09/10): sem avaliacao a loja e "Novo" — nunca uma nota inventada.

describe('resolveRating', () => {
  it('usa a nota REAL do backend quando presente (com contagem)', () => {
    expect(resolveRating(4.73, 212)).toEqual({ value: 4.73, count: 212, real: true, novo: false });
  });

  it('média real sem contagem ainda vale (a contagem é opcional)', () => {
    expect(resolveRating(4.5, undefined)).toEqual({ value: 4.5, count: undefined, real: true, novo: false });
  });

  it('média nula ou indefinida: é Novo, sem nota de exemplo', () => {
    const esperado = { value: 0, real: false, novo: true };
    expect(resolveRating(null, undefined)).toEqual(esperado);
    expect(resolveRating(undefined, undefined)).toEqual(esperado);
  });

  it('zero avaliações: é Novo, mesmo com a média 0 vinda do servidor', () => {
    expect(resolveRating(0, 0)).toEqual({ value: 0, real: false, novo: true });
    expect(resolveRating(4.2, 0).novo).toBe(true);
  });
});
