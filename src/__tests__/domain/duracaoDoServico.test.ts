import { duracaoDoServico } from '@domain/professional/duracaoDoServico';

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
