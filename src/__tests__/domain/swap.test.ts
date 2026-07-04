import {
  classifySwaps,
  swapCandidates,
  positionOf,
  swapErrorMessage,
  SwapRequest,
} from '@domain/queue/swap';

const mkSwap = (over: Partial<SwapRequest>): SwapRequest => ({
  id: 'sw-1',
  status: 'PENDING',
  proposerAttendanceId: 'att-A',
  proposerClientId: 'cli-A',
  targetAttendanceId: 'att-B',
  targetClientId: 'cli-B',
  establishmentId: 'est-1',
  professionalId: 'prof-1',
  createdAt: '2026-07-03T10:00:00Z',
  respondedAt: null,
  ...over,
});

describe('Swap Domain (#42)', () => {
  describe('classifySwaps', () => {
    it('separa recebidas (sou o alvo) de enviadas (sou o proponente)', () => {
      const list = [
        mkSwap({ id: 's1', targetClientId: 'me' }), // recebida
        mkSwap({ id: 's2', proposerClientId: 'me', targetClientId: 'cli-X' }), // enviada
        mkSwap({ id: 's3', proposerClientId: 'other', targetClientId: 'other2' }), // nenhuma
      ];
      const { received, sent } = classifySwaps(list, 'me');
      expect(received.map((s) => s.id)).toEqual(['s1']);
      expect(sent.map((s) => s.id)).toEqual(['s2']);
    });

    it('ignora propostas não-PENDING', () => {
      const list = [mkSwap({ id: 's1', status: 'ACCEPTED', targetClientId: 'me' })];
      const { received } = classifySwaps(list, 'me');
      expect(received).toHaveLength(0);
    });

    it('sem clientId retorna vazio (não classifica nada como meu)', () => {
      const list = [mkSwap({ targetClientId: null, proposerClientId: null })];
      const { received, sent } = classifySwaps(list, null);
      expect(received).toHaveLength(0);
      expect(sent).toHaveLength(0);
    });
  });

  describe('swapCandidates', () => {
    const queue = [
      { id: 'att-A', status: 'SCHEDULED' },
      { id: 'att-B', status: 'SCHEDULED' },
      { id: 'att-C', status: 'SCHEDULED' },
    ];

    it('lista os OUTROS SCHEDULED com posição 1-based, excluindo o próprio', () => {
      const cands = swapCandidates(queue, 'att-B');
      expect(cands).toEqual([
        { attendanceId: 'att-A', position: 1 },
        { attendanceId: 'att-C', position: 3 },
      ]);
    });

    it('ignora quem não está SCHEDULED', () => {
      const q = [
        { id: 'att-A', status: 'IN_PROGRESS' },
        { id: 'att-B', status: 'SCHEDULED' },
      ];
      expect(swapCandidates(q, 'att-Z')).toEqual([{ attendanceId: 'att-B', position: 1 }]);
    });
  });

  describe('positionOf', () => {
    const queue = [
      { id: 'att-A', status: 'SCHEDULED' },
      { id: 'att-B', status: 'SCHEDULED' },
    ];
    it('devolve a posição 1-based', () => {
      expect(positionOf(queue, 'att-B')).toBe(2);
    });
    it('null quando não acha ou id nulo', () => {
      expect(positionOf(queue, 'att-X')).toBeNull();
      expect(positionOf(queue, null)).toBeNull();
    });
  });

  describe('swapErrorMessage', () => {
    it('409 já pendente, 422 não permitido, 403 não pode, genérico', () => {
      expect(swapErrorMessage(409)).toMatch(/em aberto/i);
      expect(swapErrorMessage(422)).toMatch(/não é possível trocar/i);
      expect(swapErrorMessage(403)).toMatch(/não pode/i);
      expect(swapErrorMessage(500)).toMatch(/tente novamente/i);
    });
  });
});
