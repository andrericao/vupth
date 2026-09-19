import {
  canCancelAttendance,
  isActiveAttendance,
  formatWaitTime,
  shouldCreateAttendance,
  estimatedStartTime,
  formatClockTime,
  formatElapsed,
  reconcileQueueEstimate,
  canReshuffleQueue,
  incursLatePenalty,
  buildTargetFromTime,
  validateRescheduleTime,
  rescheduleErrorMessage,
  moveToEndErrorMessage,
  LATE_PENALTY_THRESHOLD_MINUTES,
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

    // 🔴 Andre, 19/09: "não consigo marcar o corte". Quem fugia do popup de
    // avaliar deixava o atendimento TERMINADO guardado no aparelho (só o
    // "Concluir" limpava), e a partir daí toda tentativa de marcar com o mesmo
    // profissional caía na tela da avaliação, sem criar nada.
    it('CRIA quando a fila guardada já ACABOU — histórico não bloqueia corte novo', () => {
      expect(shouldCreateAttendance({ ...base, hasAttendanceId: true, localStatus: 'FINISHED' })).toBe(true);
      expect(shouldCreateAttendance({ ...base, hasAttendanceId: true, localStatus: 'CANCELLED' })).toBe(true);
    });

    it('e continua NÃO criando com fila viva — inclusive pausada', () => {
      for (const localStatus of ['SCHEDULED', 'IN_PROGRESS', 'PAUSED']) {
        expect(shouldCreateAttendance({ ...base, hasAttendanceId: true, localStatus })).toBe(false);
      }
    });
  });

  describe('reconcileQueueEstimate (countdown monotônico)', () => {
    const NOW = 1_000_000_000_000;
    const minAgo = (m: number) => NOW - m * 60000;

    it('re-ancora pra baixo quando o servidor indica menos tempo (fila andou)', () => {
      // entrou há 5min com 60min de estimativa -> restando ~55min
      const out = reconcileQueueEstimate({ enteredAt: minAgo(5), estimatedMinutes: 60 }, 40, NOW);
      expect(out).toEqual({ enteredAt: NOW, estimatedMinutes: 40 });
    });

    it('NÃO altera quando o servidor indica um pouco mais e ainda descontando (sem pulo pra cima)', () => {
      const out = reconcileQueueEstimate({ enteredAt: minAgo(5), estimatedMinutes: 60 }, 58, NOW);
      expect(out).toBeNull();
    });

    it('re-ancora pra cima quando já zerou localmente mas o servidor ainda tem espera', () => {
      // entrou há 65min com 60min -> restante negativo (zerado)
      const out = reconcileQueueEstimate({ enteredAt: minAgo(65), estimatedMinutes: 60 }, 30, NOW);
      expect(out).toEqual({ enteredAt: NOW, estimatedMinutes: 30 });
    });
  });

  describe('estimatedStartTime / formatClockTime', () => {
    it('soma os minutos restantes a agora e formata HH:MM', () => {
      const base = new Date(2026, 5, 27, 14, 0, 0).getTime(); // 14:00 local
      expect(estimatedStartTime(base, 45)).toBe('14:45');
      expect(estimatedStartTime(base, 90)).toBe('15:30');
    });

    it('trata minutos <= 0 como previsão = agora', () => {
      const base = new Date(2026, 5, 27, 9, 5, 0).getTime();
      expect(estimatedStartTime(base, 0)).toBe('09:05');
      expect(estimatedStartTime(base, -10)).toBe('09:05');
    });

    it('formatClockTime preenche zero à esquerda', () => {
      expect(formatClockTime(new Date(2026, 0, 1, 8, 7))).toBe('08:07');
    });
  });

  describe('formatElapsed', () => {
    it('formata segundos como m:ss', () => {
      expect(formatElapsed(0)).toBe('0:00');
      expect(formatElapsed(5)).toBe('0:05');
      expect(formatElapsed(65)).toBe('1:05');
      expect(formatElapsed(600)).toBe('10:00');
    });
    it('usa h:mm:ss acima de 1h', () => {
      expect(formatElapsed(3661)).toBe('1:01:01');
    });
    it('trata negativo como 0', () => {
      expect(formatElapsed(-10)).toBe('0:00');
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

  describe('canReshuffleQueue (Item 16 — trocar é sempre livre)', () => {
    it('permite remanejar sempre que aguardando (SCHEDULED), independente do ETA', () => {
      expect(canReshuffleQueue('SCHEDULED')).toBe(true);
    });

    it('NÃO permite fora de SCHEDULED', () => {
      const others: AttendanceStatus[] = ['IN_PROGRESS', 'PAUSED', 'FINISHED', 'CANCELLED'];
      others.forEach((status) => expect(canReshuffleQueue(status)).toBe(false));
    });
  });

  describe('incursLatePenalty (multa pelo TEMPO estimado, não pelo status)', () => {
    it('multa quando falta MENOS de 1h para ser atendido', () => {
      expect(incursLatePenalty(59)).toBe(true);
      expect(incursLatePenalty(10)).toBe(true);
      expect(incursLatePenalty(0)).toBe(true);
    });

    it('SEM multa no limiar (60min) ou acima — sair/remanejar cedo não prejudica', () => {
      expect(incursLatePenalty(LATE_PENALTY_THRESHOLD_MINUTES)).toBe(false);
      expect(incursLatePenalty(120)).toBe(false);
    });
  });

  describe('buildTargetFromTime (Item 16 — formulário de horário)', () => {
    it('constrói o horário local de HOJE (hora/minuto), zerando seg/ms', () => {
      const dayRef = new Date(2026, 6, 3, 9, 5, 30).getTime(); // 03/07 09:05:30 local
      const d = new Date(buildTargetFromTime(dayRef, 16, 30));
      expect(d.getHours()).toBe(16);
      expect(d.getMinutes()).toBe(30);
      expect(d.getSeconds()).toBe(0);
      expect(d.getDate()).toBe(3);
    });
  });

  describe('validateRescheduleTime (Item 16 — validação básica)', () => {
    const floor = new Date(2026, 6, 3, 13, 0, 0).getTime(); // fim da fila 13:00
    it('aceita horário válido após o piso', () => {
      const target = buildTargetFromTime(floor, 16, 0);
      expect(validateRescheduleTime(16, 0, target, floor)).toBeNull();
    });
    it('rejeita hora/minuto fora de faixa', () => {
      expect(validateRescheduleTime(24, 0, floor, floor)).toMatch(/hora inválida/i);
      expect(validateRescheduleTime(10, 60, floor, floor)).toMatch(/minuto inválido/i);
    });
    it('rejeita horário antes do fim da fila de hoje', () => {
      const target = buildTargetFromTime(floor, 11, 0); // 11:00 < 13:00
      expect(validateRescheduleTime(11, 0, target, floor)).toMatch(/após o fim da fila/i);
    });
  });

  describe('rescheduleErrorMessage (Item 16)', () => {
    it('422 ou QUEUE_TARGET_NOT_FEASIBLE → alvo inviável', () => {
      expect(rescheduleErrorMessage(422)).toMatch(/horário mais adiante/i);
      expect(rescheduleErrorMessage(undefined, 'QUEUE_TARGET_NOT_FEASIBLE')).toMatch(/horário mais adiante/i);
    });

    it('400 → horário no passado/ inválido', () => {
      expect(rescheduleErrorMessage(400)).toMatch(/inválido|futuro/i);
    });

    it('403 → não é o dono', () => {
      expect(rescheduleErrorMessage(403)).toMatch(/não pode remanejar/i);
    });

    it('genérico para o resto', () => {
      expect(rescheduleErrorMessage(500)).toMatch(/tente novamente/i);
    });
  });

  describe('moveToEndErrorMessage (Item 16)', () => {
    it('400 → só enquanto aguarda', () => {
      expect(moveToEndErrorMessage(400)).toMatch(/enquanto você aguarda/i);
    });

    it('403 → não é o dono', () => {
      expect(moveToEndErrorMessage(403)).toMatch(/não pode remanejar/i);
    });

    it('genérico para o resto', () => {
      expect(moveToEndErrorMessage(500)).toMatch(/tente novamente/i);
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
