import { MOCK_ESTABLISHMENTS } from '@domain/establishment/mockData';

describe('Establishment Domain', () => {
  describe('MOCK_ESTABLISHMENTS', () => {
    it('deve conter pelo menos 1 estabelecimento', () => {
      expect(MOCK_ESTABLISHMENTS.length).toBeGreaterThan(0);
    });

    it('cada estabelecimento deve ter campos obrigatórios', () => {
      MOCK_ESTABLISHMENTS.forEach((e) => {
        expect(e.id).toBeTruthy();
        expect(e.name).toBeTruthy();
        expect(e.ownerId).toBeTruthy();
        expect(['OPEN', 'CLOSED', 'TEMPORARILY_CLOSED']).toContain(e.open_status);
        expect(['ACTIVE', 'INACTIVE', 'TEMPORARY_CLOSED']).toContain(e.status);
        expect(Array.isArray(e.services)).toBe(true);
      });
    });

    it('services deve ser array de strings', () => {
      MOCK_ESTABLISHMENTS.forEach((e) => {
        e.services.forEach((item) => {
          expect(typeof item).toBe('string');
        });
      });
    });

    it('deve ter pelo menos um estabelecimento aberto e um fechado', () => {
      const hasOpen = MOCK_ESTABLISHMENTS.some((e) => e.open_status === 'OPEN');
      const hasClosed = MOCK_ESTABLISHMENTS.some((e) => e.open_status === 'CLOSED');
      expect(hasOpen).toBe(true);
      expect(hasClosed).toBe(true);
    });

    it('endereço deve ter zipCode com 8 dígitos puros', () => {
      MOCK_ESTABLISHMENTS.forEach((e) => {
        if (e.address) {
          expect(e.address.zipCode).toMatch(/^\d{8}$/);
        }
      });
    });
  });

  describe('filtro por open_status', () => {
    it('deve filtrar corretamente por OPEN', () => {
      const open = MOCK_ESTABLISHMENTS.filter((e) => e.open_status === 'OPEN');
      expect(open.length).toBeGreaterThan(0);
      open.forEach((e) => {
        expect(e.open_status).toBe('OPEN');
      });
    });

    it('filtro ALL deve retornar todos', () => {
      const all = MOCK_ESTABLISHMENTS.filter(() => true);
      expect(all.length).toBe(MOCK_ESTABLISHMENTS.length);
    });
  });
});
