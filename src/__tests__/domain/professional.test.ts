import { MOCK_PROFESSIONALS } from '@domain/professional/mockData';

describe('Professional Domain', () => {
  describe('MOCK_PROFESSIONALS', () => {
    it('deve ter profissionais para pelo menos um estabelecimento', () => {
      const keys = Object.keys(MOCK_PROFESSIONALS);
      expect(keys.length).toBeGreaterThan(0);
    });

    it('cada profissional deve ter campos obrigatórios', () => {
      Object.values(MOCK_PROFESSIONALS).forEach((profs) => {
        profs.forEach((p) => {
          expect(p.id).toBeTruthy();
          expect(p.name).toBeTruthy();
          expect(p.specialty).toBeTruthy();
          expect(typeof p.is_available).toBe('boolean');
          expect(typeof p.estimated_wait_minutes).toBe('number');
          expect(Array.isArray(p.waiting_list)).toBe(true);
          expect(typeof p.queue_count).toBe('number');
        });
      });
    });

    it('estimated_wait_minutes deve ser >= 0', () => {
      Object.values(MOCK_PROFESSIONALS).forEach((profs) => {
        profs.forEach((p) => {
          expect(p.estimated_wait_minutes).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('queue_count deve corresponder ao tamanho da waiting_list', () => {
      Object.values(MOCK_PROFESSIONALS).forEach((profs) => {
        profs.forEach((p) => {
          expect(p.queue_count).toBe(p.waiting_list.length);
        });
      });
    });

    it('profissional sem fila deve ter estimated_wait_minutes = 0', () => {
      Object.values(MOCK_PROFESSIONALS).forEach((profs) => {
        profs.forEach((p) => {
          if (p.waiting_list.length === 0) {
            expect(p.estimated_wait_minutes).toBe(0);
          }
        });
      });
    });
  });

  describe('menor fila', () => {
    it('deve encontrar o profissional com menor espera no estabelecimento 1', () => {
      const profs = MOCK_PROFESSIONALS['1'];
      const shortest = profs.reduce((prev, curr) =>
        curr.estimated_wait_minutes < prev.estimated_wait_minutes ? curr : prev
      );
      expect(shortest.name).toBe('Carlos Silva');
      expect(shortest.estimated_wait_minutes).toBe(15);
    });
  });
});
