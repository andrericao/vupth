import { comFuso, quandoDoPedido } from '@domain/queue/horarioDoCorte';

// Pedido de corte com dia e horário (S26, Backend 36c4359).

describe('comFuso', () => {
  it('a hora local com o deslocamento do aparelho — o servidor lê o mesmo instante', () => {
    const d = new Date(2026, 9, 5, 14, 30, 0);
    const iso = comFuso(d);
    expect(iso).toMatch(/^2026-10-05T14:30:00[+-]\d{2}:\d{2}$/);
    expect(Date.parse(iso)).toBe(d.getTime());
  });

  it('fuso positivo e com minutos (ex.: +05:30)', () => {
    const d = new Date(2026, 0, 2, 3, 4, 5);
    const spy = jest.spyOn(d, 'getTimezoneOffset').mockReturnValue(-330);
    expect(comFuso(d)).toBe('2026-01-02T03:04:05+05:30');
    spy.mockReturnValue(180);
    expect(comFuso(d)).toBe('2026-01-02T03:04:05-03:00');
  });
});

describe('quandoDoPedido', () => {
  const agora = new Date(2026, 9, 4, 22, 0).getTime(); // domingo, 04/10

  it('hoje, amanhã, e depois o dia da semana com a data', () => {
    expect(quandoDoPedido(new Date(2026, 9, 4, 23, 30), agora)).toBe('hoje às 23:30');
    expect(quandoDoPedido(new Date(2026, 9, 5, 9, 5), agora)).toBe('amanhã às 09:05');
    expect(quandoDoPedido(new Date(2026, 9, 7, 18, 0), agora)).toBe('qua, 07/10 às 18:00');
  });
});
