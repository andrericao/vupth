import { MOCK_ESTABLISHMENTS } from '@domain/establishment/mockData';
import { Establishment, ServiceType } from '@domain/establishment/types';

describe('Establishment Domain', () => {
  describe('MOCK_ESTABLISHMENTS', () => {
    it('deve conter pelo menos 1 estabelecimento', () => {
      expect(MOCK_ESTABLISHMENTS.length).toBeGreaterThan(0);
    });

    it('cada estabelecimento deve ter campos obrigatórios', () => {
      MOCK_ESTABLISHMENTS.forEach((e) => {
        expect(e.id).toBeTruthy();
        expect(e.name).toBeTruthy();
        expect(e.serviceType).toBeTruthy();
        expect(typeof e.isOpen).toBe('boolean');
        expect(Array.isArray(e.serviceItems)).toBe(true);
      });
    });

    it('cada serviceItem deve ter preço positivo e duração positiva', () => {
      MOCK_ESTABLISHMENTS.forEach((e) => {
        e.serviceItems.forEach((item) => {
          expect(item.price).toBeGreaterThan(0);
          expect(item.estimatedMinutes).toBeGreaterThan(0);
        });
      });
    });

    it('deve ter pelo menos um estabelecimento aberto e um fechado', () => {
      const hasOpen = MOCK_ESTABLISHMENTS.some((e) => e.isOpen);
      const hasClosed = MOCK_ESTABLISHMENTS.some((e) => !e.isOpen);
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

  describe('filtro por serviceType', () => {
    it('deve filtrar corretamente por BARBER', () => {
      const barbers = MOCK_ESTABLISHMENTS.filter(
        (e) => e.serviceType === 'BARBER'
      );
      expect(barbers.length).toBeGreaterThan(0);
      barbers.forEach((e) => {
        expect(e.serviceType).toBe('BARBER');
      });
    });

    it('filtro ALL deve retornar todos', () => {
      const all = MOCK_ESTABLISHMENTS.filter(() => true);
      expect(all.length).toBe(MOCK_ESTABLISHMENTS.length);
    });
  });
});
