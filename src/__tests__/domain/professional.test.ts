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
          expect(typeof p.isAvailable).toBe('boolean');
          expect(typeof p.estimatedWaitMinutes).toBe('number');
          expect(Array.isArray(p.attendancesInQueue)).toBe(true);
        });
      });
    });

    it('estimatedWaitMinutes deve ser >= 0', () => {
      Object.values(MOCK_PROFESSIONALS).forEach((profs) => {
        profs.forEach((p) => {
          expect(p.estimatedWaitMinutes).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('posições na fila devem ser sequenciais a partir de 1', () => {
      Object.values(MOCK_PROFESSIONALS).forEach((profs) => {
        profs.forEach((p) => {
          p.attendancesInQueue.forEach((a, index) => {
            expect(a.position).toBe(index + 1);
          });
        });
      });
    });

    it('profissional sem fila deve ter estimatedWaitMinutes = 0', () => {
      Object.values(MOCK_PROFESSIONALS).forEach((profs) => {
        profs.forEach((p) => {
          if (p.attendancesInQueue.length === 0) {
            expect(p.estimatedWaitMinutes).toBe(0);
          }
        });
      });
    });
  });

  describe('menor fila', () => {
    it('deve encontrar o profissional com menor espera no estabelecimento 1', () => {
      const profs = MOCK_PROFESSIONALS['1'];
      const shortest = profs.reduce((prev, curr) =>
        curr.estimatedWaitMinutes < prev.estimatedWaitMinutes ? curr : prev
      );
      expect(shortest.name).toBe('Carlos Silva');
      expect(shortest.estimatedWaitMinutes).toBe(15);
    });
  });
});
