import { MOCK_ESTABLISHMENTS } from '@domain/establishment/mockData';
import { MOCK_PROFESSIONALS } from '@domain/professional/mockData';
import { ProfessionalWithQueue } from '@domain/professional/types';
import { isAuthenticated, setAuthenticated } from '@domain/auth/authState';

function findShortestQueue(professionals: ProfessionalWithQueue[]): ProfessionalWithQueue {
  return professionals.reduce((prev, curr) =>
    curr.estimatedWaitMinutes < prev.estimatedWaitMinutes ? curr : prev
  );
}

function getMinWait(professionals: ProfessionalWithQueue[]): number {
  if (professionals.length === 0) return 0;
  return Math.min(...professionals.map((p) => p.estimatedWaitMinutes));
}

describe('EstablishmentDetail - Lógica', () => {
  describe('menor fila', () => {
    it('deve encontrar profissional com menor espera no estabelecimento 1', () => {
      const profs = MOCK_PROFESSIONALS['1'];
      const shortest = findShortestQueue(profs);
      expect(shortest.id).toBe('p1');
      expect(shortest.estimatedWaitMinutes).toBe(15);
    });

    it('deve retornar o único profissional quando há só um', () => {
      const profs = MOCK_PROFESSIONALS['2'];
      const shortest = findShortestQueue(profs);
      expect(shortest.id).toBe('p3');
    });

    it('minWait deve ser 0 quando profissional sem fila', () => {
      const profs = MOCK_PROFESSIONALS['2'];
      expect(getMinWait(profs)).toBe(0);
    });

    it('minWait deve ser 0 quando não há profissionais', () => {
      expect(getMinWait([])).toBe(0);
    });
  });

  describe('estabelecimento por ID', () => {
    it('deve encontrar estabelecimento existente', () => {
      const found = MOCK_ESTABLISHMENTS.find((e) => e.id === '1');
      expect(found).toBeDefined();
      expect(found!.name).toBe('Barbearia Top');
    });

    it('deve retornar undefined para ID inexistente', () => {
      const found = MOCK_ESTABLISHMENTS.find((e) => e.id === '999');
      expect(found).toBeUndefined();
    });
  });

  describe('auth guard para entrar na fila', () => {
    beforeEach(() => {
      setAuthenticated(false);
    });

    it('não autenticado não pode entrar na fila', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('autenticado pode entrar na fila', () => {
      setAuthenticated(true);
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('estabelecimento fechado', () => {
    it('Nail Designer deve estar fechado', () => {
      const nailSalon = MOCK_ESTABLISHMENTS.find((e) => e.id === '3');
      expect(nailSalon).toBeDefined();
      expect(nailSalon!.isOpen).toBe(false);
    });

    it('não deve ter profissionais quando fechado (mock)', () => {
      const profs = MOCK_PROFESSIONALS['3'] ?? [];
      expect(profs.length).toBe(0);
    });
  });
});
