import {
  canCancelAttendance,
  isActiveAttendance,
  formatWaitTime,
  shouldCreateAttendance,
  AttendanceStatus,
} from '@domain/queue/types';
import { MOCK_QUEUE_POSITION } from '@domain/queue/mockData';

describe('Queue Domain', () => {
  describe('shouldCreateAttendance', () => {
    const base = {
      alreadyCreated: false,
      hasAttendanceId: false,
      hasToken: true,
      serviceItemIds: ['s1'],
    };

    it('cria quando veio com serviços, sem atendimento e com token', () => {
      expect(shouldCreateAttendance(base)).toBe(true);
    });

    it('NÃO cria sem serviços (re-entrada via banner Home/Atendimentos) — evita "no service found"', () => {
      expect(shouldCreateAttendance({ ...base, serviceItemIds: [] })).toBe(false);
      expect(shouldCreateAttendance({ ...base, serviceItemIds: undefined })).toBe(false);
    });

    it('NÃO cria se já existe attendanceId (fila real em andamento)', () => {
      expect(shouldCreateAttendance({ ...base, hasAttendanceId: true })).toBe(false);
    });

    it('NÃO cria se já criou nesta montagem (guard de idempotência)', () => {
      expect(shouldCreateAttendance({ ...base, alreadyCreated: true })).toBe(false);
    });

    it('NÃO cria sem token', () => {
      expect(shouldCreateAttendance({ ...base, hasToken: false })).toBe(false);
    });
  });

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

    it('deve formatar 1 minuto', () => {
      expect(formatWaitTime(1)).toBe('1 min');
    });

    it('deve formatar 59 minutos (limite antes de 1h)', () => {
      expect(formatWaitTime(59)).toBe('59 min');
    });

    it('deve formatar minutos simples', () => {
      expect(formatWaitTime(15)).toBe('15 min');
      expect(formatWaitTime(45)).toBe('45 min');
    });

    it('deve formatar horas exatas', () => {
      expect(formatWaitTime(60)).toBe('1h');
      expect(formatWaitTime(120)).toBe('2h');
      expect(formatWaitTime(180)).toBe('3h');
    });

    it('deve formatar horas com minutos', () => {
      expect(formatWaitTime(61)).toBe('1h 1min');
      expect(formatWaitTime(75)).toBe('1h 15min');
      expect(formatWaitTime(150)).toBe('2h 30min');
    });
  });

  describe('MOCK_QUEUE_POSITION', () => {
    it('deve ter campos obrigatórios', () => {
      expect(MOCK_QUEUE_POSITION.attendanceId).toBeTruthy();
      expect(MOCK_QUEUE_POSITION.professionalName).toBeTruthy();
      expect(MOCK_QUEUE_POSITION.establishmentName).toBeTruthy();
      expect(MOCK_QUEUE_POSITION.position).toBeGreaterThan(0);
      expect(MOCK_QUEUE_POSITION.estimatedWaitMinutes).toBeGreaterThanOrEqual(0);
    });

    it('deve ter status que permite cancelamento', () => {
      expect(canCancelAttendance(MOCK_QUEUE_POSITION.status)).toBe(true);
    });

    it('deve ser um atendimento ativo', () => {
      expect(isActiveAttendance(MOCK_QUEUE_POSITION.status)).toBe(true);
    });
  });

  describe('regra de negócio: cliente só cancela SCHEDULED (PRD Backend)', () => {
    it('SCHEDULED pode ser cancelado pelo cliente', () => {
      expect(canCancelAttendance('SCHEDULED')).toBe(true);
    });

    it('IN_PROGRESS não pode ser cancelado (retorna 403 no backend)', () => {
      expect(canCancelAttendance('IN_PROGRESS')).toBe(false);
    });

    it('PAUSED não pode ser cancelado (retorna 403 no backend)', () => {
      expect(canCancelAttendance('PAUSED')).toBe(false);
    });

    it('FINISHED não pode ser cancelado (retorna 403 no backend)', () => {
      expect(canCancelAttendance('FINISHED')).toBe(false);
    });
  });
});
