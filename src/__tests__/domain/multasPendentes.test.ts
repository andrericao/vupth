import { origemDaMulta, contaComMultas, reais } from '@domain/queue/multasPendentes';
import type { PendingPenalty } from '@services/penaltyService';

// Andre, 25/09: as multas pendentes entram na conta, separadas do serviço, e
// cada uma diz de onde veio (Backend 389a152).

const multa = (over: Partial<PendingPenalty> = {}): PendingPenalty => ({
  penaltyId: 'm1', type: 'LATE_CANCEL', amount: 5,
  originDate: '2026-09-25T15:00:00', originProfessionalName: 'Carlos', originEstablishmentName: 'Barbearia Premium',
  ...over,
});

describe('de onde veio a multa', () => {
  it('motivo, quem e quando', () => {
    expect(origemDaMulta(multa())).toBe('Saiu da fila · Carlos, Barbearia Premium · 25/09');
    expect(origemDaMulta(multa({ type: 'NO_SHOW' }))).toMatch(/^Não compareceu/);
    expect(origemDaMulta(multa({ type: 'LATE_ARRIVAL' }))).toMatch(/^3º atraso/);
  });

  it('o que falta some sem deixar lacuna; tipo desconhecido vira "Multa"', () => {
    expect(origemDaMulta(multa({ type: 'X', originProfessionalName: null, originEstablishmentName: null, originDate: null }))).toBe('Multa');
    expect(origemDaMulta(multa({ originEstablishmentName: null, originDate: 'lixo' }))).toBe('Saiu da fila · Carlos');
  });
});

describe('a conta do próximo atendimento', () => {
  it('serviço + multas', () => {
    expect(contaComMultas(30, [multa(), multa({ penaltyId: 'm2', amount: 3 })])).toEqual({ servico: 30, totalMultas: 8, total: 38 });
    expect(contaComMultas(30, [])).toEqual({ servico: 30, totalMultas: 0, total: 30 });
  });

  it('valor que veio como texto ainda soma; lixo conta zero', () => {
    expect(contaComMultas(10, [multa({ amount: '5.00' as never }), multa({ amount: 'x' as never })]).total).toBe(15);
  });

  it('em reais', () => {
    expect(reais(38)).toBe('R$ 38,00');
  });
});
