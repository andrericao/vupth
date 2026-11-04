import { avisoDe, avisosPendentes, rotuloDoAviso } from '@domain/avisoDeAbertura';
import type { AvisoDeAbertura } from '@services/openWatchService';

const aviso = (p: Partial<AvisoDeAbertura>): AvisoDeAbertura => ({
  id: 'w1',
  establishment_id: 'e1',
  professional_id: null,
  kind: 'NOTIFY_OPEN',
  day: '2026-11-04',
  created_at: '2026-11-04T08:00:00-03:00',
  fired_at: null,
  ...p,
});

describe('avisoDe', () => {
  const avisos = [
    aviso({ id: 'loja' }),
    aviso({ id: 'prof', professional_id: 'p1' }),
    aviso({ id: 'andar', kind: 'QUEUE_MOVING', professional_id: 'p1' }),
    aviso({ id: 'outra', establishment_id: 'e2' }),
  ];

  it('acha o da loja (sem profissional) e o do profissional, pelo tipo', () => {
    expect(avisoDe(avisos, 'e1', 'NOTIFY_OPEN')?.id).toBe('loja');
    expect(avisoDe(avisos, 'e1', 'NOTIFY_OPEN', 'p1')?.id).toBe('prof');
    expect(avisoDe(avisos, 'e1', 'QUEUE_MOVING', 'p1')?.id).toBe('andar');
    expect(avisoDe(avisos, 'e2', 'NOTIFY_OPEN')?.id).toBe('outra');
  });

  it('sem pedido, ou sem lista, é null', () => {
    expect(avisoDe(avisos, 'e1', 'QUEUE_MOVING')).toBeNull();
    expect(avisoDe(undefined, 'e1', 'NOTIFY_OPEN')).toBeNull();
  });
});

describe('avisosPendentes e rotuloDoAviso', () => {
  it('só os que ainda vão avisar', () => {
    const lista = [aviso({ id: 'a' }), aviso({ id: 'b', fired_at: '2026-11-04T09:00:00-03:00' })];
    expect(avisosPendentes(lista).map((a) => a.id)).toEqual(['a']);
    expect(avisosPendentes(undefined)).toEqual([]);
  });

  it('o rótulo de cada tipo', () => {
    expect(rotuloDoAviso('NOTIFY_OPEN')).toBe('Avisar quando abrir');
    expect(rotuloDoAviso('QUEUE_MOVING')).toBe('Avisar quando a fila andar');
  });
});
