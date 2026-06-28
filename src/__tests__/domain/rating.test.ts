import { pseudoRating } from '@domain/establishment/rating';

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
