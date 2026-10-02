import { horariosDoDia, mensagemDoAgendamento } from '@domain/schedule/encaixe';
import { formatClockTime } from '@domain/queue/types';
import { HorariosDaLoja } from '@domain/establishment/horarios';

// Barra de encaixe (Andre, 26/09): os horários em que o serviço cabe naquele dia.

const local = (h: number, m = 0, dia = 1) => new Date(2026, 9, dia, h, m).getTime(); // 01/10/2026 = quinta
const horarios = (over: Partial<HorariosDaLoja> = {}): HorariosDaLoja => ({
  configured: true,
  weekly: [{ day: 'THURSDAY', closed: false, opens: '09:00', closes: '12:00' }, { day: 'FRIDAY', closed: true }],
  exceptions: [],
  upcoming: [],
  ...over,
});
const horas = (r: ReturnType<typeof horariosDoDia>) => (r.tipo === 'livres' ? r.horarios.map(formatClockTime) : r.tipo);

describe('os horários do dia', () => {
  it('outro dia: do abrir ao fechar, de 30 em 30, cabendo o serviço inteiro', () => {
    const r = horariosDoDia({ dia: new Date(2026, 9, 1), agoraMs: local(7, 0, 0), horarios: horarios(), agenda: null, minutosDoServico: 60 });
    expect(horas(r)).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00']);
  });

  it('o reservado (anônimo) não é oferecido, nem o que cruza com ele', () => {
    const agenda = { frame: null, blocks: [{ start: new Date(local(10)).toISOString(), durationMinutes: 30 }] };
    const r = horariosDoDia({ dia: new Date(2026, 9, 1), agoraMs: local(7, 0, 0), horarios: horarios(), agenda, minutosDoServico: 60 });
    expect(horas(r)).toEqual(['09:00', '10:30', '11:00']);
  });

  it('hoje: depois de agora e do fim projetado da fila', () => {
    const agenda = { frame: { projectedQueueEnd: new Date(local(10, 10)).toISOString() }, blocks: [] };
    const r = horariosDoDia({ dia: new Date(2026, 9, 1), agoraMs: local(9, 20), horarios: horarios(), agenda, minutosDoServico: 30 });
    expect(horas(r)).toEqual(['10:30', '11:00', '11:30']);
  });

  it('loja fechada, sem horário informado, ou sem vaga', () => {
    expect(horariosDoDia({ dia: new Date(2026, 9, 2), agoraMs: local(7), horarios: horarios(), agenda: null, minutosDoServico: 30 }).tipo).toBe('fechada');
    expect(horariosDoDia({ dia: new Date(2026, 9, 1), agoraMs: local(7), horarios: { ...horarios(), configured: false }, agenda: null, minutosDoServico: 30 }).tipo).toBe('sem-horario');
    expect(horariosDoDia({ dia: new Date(2026, 9, 3), agoraMs: local(7), horarios: horarios(), agenda: null, minutosDoServico: 30 }).tipo).toBe('sem-horario');
    expect(horariosDoDia({ dia: new Date(2026, 9, 1), agoraMs: local(7, 0, 0), horarios: horarios(), agenda: null, minutosDoServico: 240 }).tipo).toBe('cheio');
  });

  it('horário mal formado na loja não vira horário inventado', () => {
    const h = horarios({ weekly: [{ day: 'THURSDAY', closed: false, opens: 'xx', closes: '12:00' }] });
    expect(horariosDoDia({ dia: new Date(2026, 9, 1), agoraMs: local(7, 0, 0), horarios: h, agenda: null, minutosDoServico: 30 }).tipo).toBe('sem-horario');
  });

  it('bloco com data inválida é ignorado; fim de fila inválido também', () => {
    const agenda = { frame: { projectedQueueEnd: 'lixo' }, blocks: [{ start: 'lixo', durationMinutes: 30 }] };
    const r = horariosDoDia({ dia: new Date(2026, 9, 1), agoraMs: local(11, 0), horarios: horarios(), agenda, minutosDoServico: 30 });
    expect(horas(r)).toEqual(['11:00', '11:30']);
  });
});

describe('a recusa do servidor ao agendar', () => {
  it('cada código tem a sua frase', () => {
    expect(mensagemDoAgendamento(422, 'INTENTION_OUTSIDE_BUSINESS_HOURS')).toMatch(/fora do expediente/);
    expect(mensagemDoAgendamento(422, 'INTENTION_HORIZON_EXCEEDED')).toMatch(/30 dias/);
    expect(mensagemDoAgendamento(422, 'INTENTION_BEFORE_QUEUE_END')).toMatch(/fila de hoje/);
    expect(mensagemDoAgendamento(409, 'PROFESSIONAL_AGENDA_FULL')).toMatch(/ocupado/);
    expect(mensagemDoAgendamento(400)).toMatch(/já passou/);
    expect(mensagemDoAgendamento(500)).toMatch(/Tente de novo/);
  });
});
