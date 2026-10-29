import { quedaBruscaDoPush, tituloDaQueda, cronometroDaJanela, msDoTexto } from '@domain/queda/quedaBrusca';

describe('queda brusca (DEC-128)', () => {
  it('o push SUDDEN_DROP vira o horário novo e o fim da janela', () => {
    const q = quedaBruscaDoPush({
      type: 'SUDDEN_DROP',
      attendanceId: 'a1',
      newTime: '2026-10-29T14:40:00-03:00',
      previousTime: '2026-10-29T15:50:00-03:00',
      windowUntil: '2026-10-29T15:00:00-03:00',
    });
    expect(q?.attendanceId).toBe('a1');
    expect(q?.horario).toMatch(/^\d{2}:\d{2}$/);
    expect(q?.janelaAte).toBe(Date.parse('2026-10-29T15:00:00-03:00'));
  });

  it('sem janela (espera nova de 1 h ou mais): windowUntil "null" vira null', () => {
    const q = quedaBruscaDoPush({ type: 'SUDDEN_DROP', attendanceId: 'a1', newTime: '2026-10-29T14:40:00-03:00', windowUntil: 'null' });
    expect(q?.janelaAte).toBeNull();
  });

  it('outro tipo, sem atendimento ou sem dados não é queda', () => {
    expect(quedaBruscaDoPush({ type: 'QUEUE_NEXT_IN_LINE', attendanceId: 'a1' })).toBeNull();
    expect(quedaBruscaDoPush({ type: 'SUDDEN_DROP' })).toBeNull();
    expect(quedaBruscaDoPush(undefined)).toBeNull();
  });

  it('horário inválido ou ausente vira null, e o título cai para a frase sem horário', () => {
    expect(msDoTexto('lixo')).toBeNull();
    expect(msDoTexto(undefined)).toBeNull();
    expect(quedaBruscaDoPush({ type: 'SUDDEN_DROP', attendanceId: 'a1', newTime: 'null' })?.horario).toBeNull();
    expect(tituloDaQueda(null)).toBe('Sua vez adiantou!');
    expect(tituloDaQueda('14:40')).toBe('Sua vez adiantou para 14:40!');
  });

  it('o cronômetro mostra mm:ss e para em 00:00', () => {
    expect(cronometroDaJanela(20 * 60_000 - 18_000, 0)).toBe('19:42');
    expect(cronometroDaJanela(1000, 5000)).toBe('00:00');
  });
});
