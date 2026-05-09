import {
  canCancelAttendance,
  isActiveAttendance,
  formatWaitTime,
  AttendanceStatus,
} from '@domain/queue/types';

describe('Queue Domain', () => {
  describe('canCancelAttendance', () => {
    it('deve permitir cancelar quando status é SCHEDULED', () => {
      expect(canCancelAttendance('SCHEDULED')).toBe(true);
    });

    it('não deve permitir cancelar quando status é IN_PROGRESS', () => {
      expect(canCancelAttendance('IN_PROGRESS')).toBe(false);
    });

    it('não deve permitir cancelar quando status é PAUSED', () => {
      expect(canCancelAttendance('PAUSED')).toBe(false);
    });

    it('não deve permitir cancelar quando status é FINISHED', () => {
      expect(canCancelAttendance('FINISHED')).toBe(false);
    });

    it('não deve permitir cancelar quando status é CANCELLED', () => {
      expect(canCancelAttendance('CANCELLED')).toBe(false);
    });
  });

  describe('isActiveAttendance', () => {
    const activeStatuses: AttendanceStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'PAUSED'];
    const inactiveStatuses: AttendanceStatus[] = ['FINISHED', 'CANCELLED'];

    it.each(activeStatuses)('deve retornar true para status %s', (status) => {
      expect(isActiveAttendance(status)).toBe(true);
    });

    it.each(inactiveStatuses)('deve retornar false para status %s', (status) => {
      expect(isActiveAttendance(status)).toBe(false);
    });
  });

  describe('formatWaitTime', () => {
    it('deve retornar "Agora" para 0 minutos', () => {
      expect(formatWaitTime(0)).toBe('Agora');
    });

    it('deve formatar minutos simples', () => {
      expect(formatWaitTime(15)).toBe('15 min');
      expect(formatWaitTime(45)).toBe('45 min');
    });

    it('deve formatar horas exatas', () => {
      expect(formatWaitTime(60)).toBe('1h');
      expect(formatWaitTime(120)).toBe('2h');
    });

    it('deve formatar horas com minutos', () => {
      expect(formatWaitTime(75)).toBe('1h 15min');
      expect(formatWaitTime(150)).toBe('2h 30min');
    });
  });
});
