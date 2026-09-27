import { vagaNaFila } from '@domain/queue/swap';

// Andre, 26/09: "como o cliente decidiria se iria trocar sem saber em que horário?"
// Aceitar é ficar com a vaga de quem pediu — o lugar e o horário dela.

const AGORA = Date.parse('2026-09-26T14:00:00Z');
const fila = {
  // Em curso com 10 min faltando; depois a (20), b (30), c (15).
  totalRemainingMinutes: 10 + 20 + 30 + 15,
  attendancesInQueue: [
    { id: 'x', status: 'IN_PROGRESS', estimatedMinutes: 40 },
    { id: 'a', status: 'SCHEDULED', estimatedMinutes: 20 },
    { id: 'b', status: 'LATE', estimatedMinutes: 30 },
    { id: 'c', status: 'SCHEDULED', estimatedMinutes: 15 },
  ],
};

describe('a vaga de quem pediu a troca', () => {
  it('o primeiro que espera é chamado quando o atendimento em curso acaba', () => {
    expect(vagaNaFila(fila, 'a', AGORA)).toEqual({ posicao: 1, horarioMs: AGORA + 10 * 60000 });
  });

  it('os seguintes somam o tempo de quem vem antes', () => {
    expect(vagaNaFila(fila, 'b', AGORA)).toEqual({ posicao: 2, horarioMs: AGORA + 30 * 60000 });
    expect(vagaNaFila(fila, 'c', AGORA)).toEqual({ posicao: 3, horarioMs: AGORA + 60 * 60000 });
  });

  it('sem vaga na fila (pedido de fora, ou quem está em atendimento): nada a mostrar', () => {
    expect(vagaNaFila(fila, 'x', AGORA)).toBeNull();
    expect(vagaNaFila(fila, 'zzz', AGORA)).toBeNull();
    expect(vagaNaFila(fila, null, AGORA)).toBeNull();
  });

  it('tempo desconhecido conta zero, e o restante nunca fica negativo', () => {
    const f = {
      totalRemainingMinutes: 5,
      attendancesInQueue: [
        { id: 'a', status: 'SCHEDULED', estimatedMinutes: null },
        { id: 'b', status: 'SCHEDULED', estimatedMinutes: 30 },
      ],
    };
    expect(vagaNaFila(f, 'b', AGORA)).toEqual({ posicao: 2, horarioMs: AGORA });
  });
});
