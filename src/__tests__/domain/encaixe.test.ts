import { horariosDoDia, mensagemDoAgendamento, situacaoDoDia } from '@domain/schedule/encaixe';
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

// agendar-amanha-com-fila-aberta (Andre, 18/10): "os dias aparecem, mas não seguem".
// A tela da loja já escreve "24 horas" (abre = fecha) e "22:00 às 02:00 (vira o
// dia)", mas a barra de encaixe lia essas faixas como "fecha antes de abrir" e
// respondia "Não há horário livre" em TODO dia: o cliente escolhia o dia e não
// tinha horário para tocar.
describe('os horários do dia — 24 horas e a faixa que vira o dia', () => {
  const unica = (opens: string, closes: string) =>
    horarios({ weekly: [{ day: 'THURSDAY', closed: false, opens, closes }] });

  it('24 horas (abre = fecha): o dia inteiro, do 00:00 ao 23:30', () => {
    const r = horariosDoDia({ dia: new Date(2026, 9, 1), agoraMs: local(7, 0, 0), horarios: unica('00:00', '00:00'), agenda: null, minutosDoServico: 30 });
    const lista = horas(r) as string[];
    expect(lista[0]).toBe('00:00');
    expect(lista[lista.length - 1]).toBe('23:30');
    expect(lista).toHaveLength(48);
  });

  it('abre e fecha na mesma hora do meio do dia também é 24 horas, a partir da abertura', () => {
    const r = horariosDoDia({ dia: new Date(2026, 9, 1), agoraMs: local(7, 0, 0), horarios: unica('08:00', '08:00'), agenda: null, minutosDoServico: 60 });
    const lista = horas(r) as string[];
    expect(lista[0]).toBe('08:00');
    // O último que cabe 1 h antes das 08:00 do dia seguinte.
    expect(lista[lista.length - 1]).toBe('07:00');
  });

  it('vira o dia (22:00 às 02:00): oferece até caber antes das 02:00 do dia seguinte', () => {
    const r = horariosDoDia({ dia: new Date(2026, 9, 1), agoraMs: local(7, 0, 0), horarios: unica('22:00', '02:00'), agenda: null, minutosDoServico: 60 });
    expect(horas(r)).toEqual(['22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00']);
    // Os horários depois da meia-noite são do dia SEGUINTE, não do mesmo dia.
    const datas = (r as { horarios: Date[] }).horarios;
    expect(datas[4].getDate()).toBe(2);
    expect(datas[3].getDate()).toBe(1);
  });

  it('faixa comum (abre antes de fechar) segue como era', () => {
    const r = horariosDoDia({ dia: new Date(2026, 9, 1), agoraMs: local(7, 0, 0), horarios: unica('09:00', '10:00'), agenda: null, minutosDoServico: 30 });
    expect(horas(r)).toEqual(['09:00', '09:30']);
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

// agenda-da-semana-nao-liberada (24/10, Backend 481c56c): store_open e agenda_released por dia.
describe('situacaoDoDia', () => {
  const dia = new Date(2026, 9, 26);
  const agenda = (d: object) => ({ frame: null, blocks: [], days: [{ date: '2026-10-26', ...d }] });

  it('a loja nunca abre: fechado (o dia some)', () => {
    expect(situacaoDoDia(agenda({ closed: true, store_open: false, agenda_released: false }), dia)).toBe('fechado');
  });

  it('a loja abre e o profissional não liberou: solicitar', () => {
    expect(situacaoDoDia(agenda({ closed: true, store_open: true, agenda_released: false }), dia)).toBe('solicitar');
  });

  it('os dois liberados: agenda direto', () => {
    expect(situacaoDoDia(agenda({ closed: false, store_open: true, agenda_released: true }), dia)).toBe('livre');
  });

  it('sem o item do dia ou sem agenda (Backend anterior): null, e o app decide pelo horário da loja', () => {
    expect(situacaoDoDia(agenda({}), new Date(2026, 9, 27))).toBeNull();
    expect(situacaoDoDia({ frame: null, blocks: [] }, dia)).toBeNull();
    expect(situacaoDoDia(null, dia)).toBeNull();
  });
});
