import { groupIntentionsByDay } from '../../domain/schedule/agenda';
import { IntentionResponse } from '../../services/intentionsService';

function intention(id: string, desiredTime: string): IntentionResponse {
  return {
    id,
    establishmentId: 'est-1',
    establishmentName: 'Barbearia',
    professionalId: 'prof-1',
    professionalName: 'Carlos',
    clientId: 'cli-1',
    clientName: 'Joao',
    services: [],
    status: 'INTENTION',
    totalValue: 35,
    estimatedMinutes: 30,
    desiredTime,
    estimatedStartTime: desiredTime,
  };
}

// now fixo: 15/jul/2026 09:00 local
const now = new Date(2026, 6, 15, 9, 0);
const iso = (d: number, h: number) => new Date(2026, 6, d, h, 0).toISOString();

describe('groupIntentionsByDay', () => {
  it('agrupa por dia com rótulos Hoje/Amanhã/dd-mm, ordenando por horário', () => {
    const groups = groupIntentionsByDay(
      [intention('c', iso(17, 10)), intention('a', iso(15, 17)), intention('b', iso(16, 9))],
      now,
    );

    expect(groups.map((g) => g.dayLabel)).toEqual(['Hoje', 'Amanhã', '17/07']);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([['a'], ['b'], ['c']]);
  });

  it('mantém múltiplas intenções do mesmo dia juntas e em ordem de horário', () => {
    const groups = groupIntentionsByDay(
      [intention('tarde', iso(16, 17)), intention('manha', iso(16, 9))],
      now,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.id)).toEqual(['manha', 'tarde']);
  });

  it('ignora desiredTime inválido sem quebrar', () => {
    const groups = groupIntentionsByDay(
      [intention('ok', iso(15, 17)), intention('ruim', 'não-é-data')],
      now,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.id)).toEqual(['ok']);
  });

  it('lista vazia → sem grupos', () => {
    expect(groupIntentionsByDay([], now)).toEqual([]);
  });
});
