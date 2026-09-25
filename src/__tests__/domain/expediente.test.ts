import {
  agruparPorExpediente,
  emIntervalo,
  estaNoExpediente,
} from '@domain/professional/expediente';

// Contrato de 19/09: o backend manda TODO profissional com pelo menos um
// serviço e quem separa "Trabalhando" de "Fora" é o app.

describe('expediente', () => {
  it('ON_BREAK conta como no expediente — a pessoa volta', () => {
    expect(estaNoExpediente('ON_BREAK')).toBe(true);
    expect(emIntervalo('ON_BREAK')).toBe(true);
  });

  it('OFF é o único que sai da seção de quem trabalha', () => {
    expect(estaNoExpediente('OFF')).toBe(false);
    expect(estaNoExpediente('WORKING')).toBe(true);
  });

  it('campo AUSENTE conta como trabalhando — produção ainda pode ser anterior ao contrato', () => {
    // Se a ausência caísse em "Fora", uma loja inteira apareceria fora do
    // expediente contra o backend antigo. É o erro mais caro dos dois.
    expect(estaNoExpediente(undefined)).toBe(true);
    expect(estaNoExpediente(null)).toBe(true);
  });

  it('agrupa mantendo a ordem que o backend mandou', () => {
    const { trabalhando, fora } = agruparPorExpediente([
      { id: 'a', work_status: 'WORKING' },
      { id: 'b', work_status: 'OFF' },
      { id: 'c', work_status: 'ON_BREAK' },
      { id: 'd' },
    ] as { id: string; work_status?: string }[]);

    expect(trabalhando.map((p) => p.id)).toEqual(['a', 'c', 'd']);
    expect(fora.map((p) => p.id)).toEqual(['b']);
  });

  it('loja fechada leva todos a OFF: a seção "Fora" fica com todo mundo, nunca vazia', () => {
    const { trabalhando, fora } = agruparPorExpediente([
      { id: 'a', work_status: 'OFF' },
      { id: 'b', work_status: 'OFF' },
    ]);

    expect(trabalhando).toHaveLength(0);
    expect(fora).toHaveLength(2);
  });
});
