import { buildDayOptions, isSameDay, SCHEDULE_HORIZON_DAYS } from '../../domain/schedule/days';

describe('buildDayOptions', () => {
  it('começa em "Hoje" e depois os números dos dias', () => {
    const from = new Date(2026, 6, 15, 9, 30); // 15/jul/2026, qua
    const days = buildDayOptions(from, 3);

    expect(days).toHaveLength(3);
    expect(days[0]).toMatchObject({ isToday: true, label: 'Hoje', dayNumber: 15, weekday: 'qua' });
    expect(days[1]).toMatchObject({ isToday: false, label: '16', dayNumber: 16, weekday: 'qui' });
    expect(days[2]).toMatchObject({ isToday: false, label: '17', dayNumber: 17, weekday: 'sex' });
  });

  it('normaliza a virada de mês', () => {
    const from = new Date(2026, 6, 30, 12, 0); // 30/jul
    const days = buildDayOptions(from, 4);

    expect(days.map((d) => d.dayNumber)).toEqual([30, 31, 1, 2]);
    expect(days[2].date.getMonth()).toBe(7); // agosto
  });

  it('normaliza a virada de ano', () => {
    const from = new Date(2026, 11, 31, 12, 0); // 31/dez
    const days = buildDayOptions(from, 2);

    expect(days[1].date.getFullYear()).toBe(2027);
    expect(days[1].dayNumber).toBe(1);
  });

  it('cada opção começa na meia-noite local', () => {
    const from = new Date(2026, 6, 15, 23, 59);
    const [today] = buildDayOptions(from, 1);

    expect(today.date.getHours()).toBe(0);
    expect(today.date.getMinutes()).toBe(0);
  });

  it('usa o horizonte padrão (30 dias) sem count', () => {
    expect(buildDayOptions(new Date(2026, 6, 15))).toHaveLength(SCHEDULE_HORIZON_DAYS);
  });
});

describe('isSameDay', () => {
  it('true no mesmo dia, ignorando a hora', () => {
    expect(isSameDay(new Date(2026, 6, 15, 8, 0), new Date(2026, 6, 15, 20, 0))).toBe(true);
  });

  it('false em dias diferentes', () => {
    expect(isSameDay(new Date(2026, 6, 15), new Date(2026, 6, 16))).toBe(false);
  });
});
