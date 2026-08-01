import { findMyPosition, QueueBroadcast } from '@domain/queue/broadcast';

// Payload real capturado no diagnóstico de 2026-08-01 (página ws-test.html),
// enxugado: dois profissionais, cada um com um cliente aguardando.
function broadcast(over: Partial<QueueBroadcast> = {}): QueueBroadcast {
  return {
    id: 'est-1',
    professionals: [
      {
        id: 'prof-1',
        current_attendance: null,
        waiting_list: [
          { id: 'att-1', status: 'SCHEDULED', estimatedMinutes: 30 },
          { id: 'att-2', status: 'SCHEDULED', estimatedMinutes: 20 },
          { id: 'meu', status: 'SCHEDULED', estimatedMinutes: 30 },
        ],
      },
      {
        id: 'prof-2',
        current_attendance: null,
        waiting_list: [{ id: 'outro', status: 'SCHEDULED', estimatedMinutes: 30 }],
      },
    ],
    ...over,
  };
}

describe('broadcast da fila — findMyPosition', () => {
  it('soma a espera de quem está à minha frente', () => {
    expect(findMyPosition(broadcast(), 'meu')).toEqual({
      status: 'SCHEDULED',
      peopleAhead: 2,
      minutesAhead: 50,
    });
  });

  it('primeiro da fila: ninguém à frente', () => {
    expect(findMyPosition(broadcast(), 'att-1')).toEqual({
      status: 'SCHEDULED',
      peopleAhead: 0,
      minutesAhead: 0,
    });
  });

  it('soma também o atendimento EM CURSO do profissional', () => {
    const payload = broadcast({
      professionals: [
        {
          id: 'prof-1',
          current_attendance: { id: 'em-curso', status: 'IN_PROGRESS', estimatedMinutes: 25 },
          waiting_list: [{ id: 'meu', status: 'SCHEDULED', estimatedMinutes: 30 }],
        },
      ],
    });

    expect(findMyPosition(payload, 'meu')?.minutesAhead).toBe(25);
  });

  it('duração ausente/zerada cai no padrão de 30min (não zera a espera)', () => {
    const payload = broadcast({
      professionals: [
        {
          id: 'prof-1',
          waiting_list: [
            { id: 'sem-duracao', status: 'SCHEDULED', estimatedMinutes: null },
            { id: 'meu', status: 'SCHEDULED' },
          ],
        },
      ],
    });

    expect(findMyPosition(payload, 'meu')?.minutesAhead).toBe(30);
  });

  it('reflete o status publicado (ex.: virei IN_PROGRESS)', () => {
    const payload = broadcast({
      professionals: [
        { id: 'prof-1', waiting_list: [{ id: 'meu', status: 'IN_PROGRESS', estimatedMinutes: 30 }] },
      ],
    });

    expect(findMyPosition(payload, 'meu')?.status).toBe('IN_PROGRESS');
  });

  it('não estou na fila / payload de outra loja = null (quem decide saída é o poll)', () => {
    expect(findMyPosition(broadcast(), 'nao-existe')).toBeNull();
    expect(findMyPosition(broadcast(), undefined)).toBeNull();
    expect(findMyPosition(null, 'meu')).toBeNull();
  });

  it('payload sem profissionais/lista não quebra', () => {
    expect(findMyPosition({ id: 'est-1' }, 'meu')).toBeNull();
    expect(findMyPosition({ id: 'est-1', professionals: [{ id: 'p' }] }, 'meu')).toBeNull();
  });
});
