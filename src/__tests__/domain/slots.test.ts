import {
  computeAvailableSlots,
  freeIntervals,
  OccupiedBlock,
} from '../../domain/schedule/slots';

// Helpers de horário local (dia fixo p/ determinismo).
const at = (h: number, m = 0) => new Date(2026, 6, 15, h, m).getTime();
const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('computeAvailableSlots — exemplo do Andre (2026-07-23)', () => {
  // Fila até 14:00; corte de outro cliente às 17:00 (1h → 17:00-18:00);
  // fechamento 20:00; serviço novo soma 1h; passos de 30min.
  const block17: OccupiedBlock = { startMs: at(17), durationMinutes: 60 };

  it('oferece 14:00→16:00 (cabe antes do corte) e 18:00→19:00 (depois dele)', () => {
    const slots = computeAvailableSlots({
      floorMs: at(14),
      closingMs: at(20),
      blocks: [block17],
      serviceMinutes: 60,
      stepMinutes: 30,
    });

    expect(slots.map(hhmm)).toEqual([
      '14:00', '14:30', '15:00', '15:30', '16:00', // último início antes do corte (16:00+1h=17:00)
      '18:00', '18:30', '19:00', // depois do corte, cabendo até o fechamento (19:00+1h=20:00)
    ]);
  });

  it('16:30 NÃO aparece: 16:30 + 1h = 17:30 invadiria o corte das 17:00', () => {
    const slots = computeAvailableSlots({
      floorMs: at(14),
      closingMs: at(20),
      blocks: [block17],
      serviceMinutes: 60,
      stepMinutes: 30,
    }).map(hhmm);
    expect(slots).not.toContain('16:30');
    expect(slots).not.toContain('17:00'); // ocupado
    expect(slots).not.toContain('19:30'); // 19:30+1h passaria das 20:00
  });

  it('serviço mais longo (1h30) encurta os vãos', () => {
    const slots = computeAvailableSlots({
      floorMs: at(14),
      closingMs: at(20),
      blocks: [block17],
      serviceMinutes: 90,
      stepMinutes: 30,
    }).map(hhmm);
    // antes do corte: último início 15:30 (15:30+1h30=17:00); depois: 18:00, 18:30
    expect(slots).toEqual(['14:00', '14:30', '15:00', '15:30', '18:00', '18:30']);
  });
});

describe('computeAvailableSlots — bordas', () => {
  it('sem blocos: só piso→fechamento', () => {
    const slots = computeAvailableSlots({
      floorMs: at(14),
      closingMs: at(16),
      blocks: [],
      serviceMinutes: 60,
      stepMinutes: 30,
    }).map(hhmm);
    expect(slots).toEqual(['14:00', '14:30', '15:00']); // 15:00+1h=16:00
  });

  it('piso fora da grade é arredondado pra cima (nunca antes do piso)', () => {
    const slots = computeAvailableSlots({
      floorMs: at(14, 7), // 14:07
      closingMs: at(16),
      blocks: [],
      serviceMinutes: 30,
      stepMinutes: 30,
    }).map(hhmm);
    expect(slots[0]).toBe('14:30');
  });

  it('vão menor que a duração → nenhum horário', () => {
    const slots = computeAvailableSlots({
      floorMs: at(14),
      closingMs: at(14, 45),
      blocks: [],
      serviceMinutes: 60,
      stepMinutes: 15,
    });
    expect(slots).toEqual([]);
  });

  it('fechamento <= piso → vazio', () => {
    expect(
      computeAvailableSlots({ floorMs: at(18), closingMs: at(17), blocks: [], serviceMinutes: 30 }),
    ).toEqual([]);
  });

  it('blocos sobrepostos/fora de ordem são fundidos', () => {
    const free = freeIntervals(at(14), at(20), [
      { startMs: at(16), durationMinutes: 60 }, // 16-17
      { startMs: at(16, 30), durationMinutes: 60 }, // 16:30-17:30 (sobrepõe)
    ]);
    // vãos: 14:00-16:00 e 17:30-20:00
    expect(free.map(([s, e]) => [hhmm(new Date(s)), hhmm(new Date(e))])).toEqual([
      ['14:00', '16:00'],
      ['17:30', '20:00'],
    ]);
  });
});
