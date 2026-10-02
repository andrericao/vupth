import { comTempoAtual, duracaoDoServico } from '@domain/professional/duracaoDoServico';

describe('duracaoDoServico — o tempo que o cliente ve', () => {
  it('usa o tempo configurado pelo profissional, mesmo com media semanal diferente', () => {
    expect(duracaoDoServico({ estimatedMinutes: 45, weeklyAverageDurationInMinutes: 30 })).toBe(45);
  });

  it('sem o configurado, cai na media da semana', () => {
    expect(duracaoDoServico({ estimatedMinutes: null, weeklyAverageDurationInMinutes: 25 })).toBe(25);
  });

  it('sem nenhum dos dois, 30 (default do Backend)', () => {
    expect(duracaoDoServico({ weeklyAverageDurationInMinutes: null })).toBe(30);
  });
});

describe('comTempoAtual — o snapshot da loja traz o tempo editado', () => {
  const lidos = [
    { id: 's1', estimatedMinutes: 30 },
    { id: 's2', estimatedMinutes: 20 },
  ];

  it('troca o tempo do serviço editado e deixa o resto igual', () => {
    const r = comTempoAtual(lidos, [{ id: 's1', estimatedMinutes: 45 }]);
    expect(r).toEqual([
      { id: 's1', estimatedMinutes: 45 },
      { id: 's2', estimatedMinutes: 20 },
    ]);
    expect(r[1]).toBe(lidos[1]);
  });

  it('sem snapshot (ou sem tempo nele), fica o que foi lido', () => {
    expect(comTempoAtual(lidos, undefined)).toBe(lidos);
    expect(comTempoAtual(lidos, [])).toBe(lidos);
    expect(comTempoAtual(lidos, [{ id: 's1', estimatedMinutes: null }])[0]).toBe(lidos[0]);
  });
});
