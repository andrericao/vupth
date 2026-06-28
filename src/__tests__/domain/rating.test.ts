import { pseudoRating, resolveRating } from '@domain/establishment/rating';

describe('pseudoRating', () => {
  it('retorna valor entre 4.0 e 5.0', () => {
    for (const id of ['a', 'estab-1', 'uuid-xyz', '42', '']) {
      const r = pseudoRating(id);
      expect(r).toBeGreaterThanOrEqual(4);
      expect(r).toBeLessThanOrEqual(5);
    }
  });

  it('é estável: mesmo id sempre dá a mesma nota', () => {
    expect(pseudoRating('estab-1')).toBe(pseudoRating('estab-1'));
  });

  it('ids diferentes tendem a dar notas diferentes', () => {
    const a = pseudoRating('barbearia-do-ze');
    const b = pseudoRating('salao-da-maria');
    expect(a).not.toBe(b);
  });
});

describe('resolveRating', () => {
  it('usa a nota REAL do backend quando presente (com contagem)', () => {
    expect(resolveRating(4.73, 212, 'x')).toEqual({ value: 4.73, count: 212, real: true });
  });

  it('cai no placeholder quando a média é null/undefined', () => {
    const a = resolveRating(null, undefined, 'estab-1');
    const b = resolveRating(undefined, undefined, 'estab-1');
    expect(a.real).toBe(false);
    expect(a.count).toBeUndefined();
    expect(a.value).toBe(pseudoRating('estab-1'));
    expect(b).toEqual(a);
  });
});
