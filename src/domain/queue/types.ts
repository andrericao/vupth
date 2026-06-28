export type AttendanceStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'FINISHED'
  | 'CANCELLED';

export interface Attendance {
  id: string;
  clientId: string;
  professionalId: string;
  establishmentId: string;
  serviceItemIds: string[];
  scheduledTime: string;
  status: AttendanceStatus;
}

export interface QueuePosition {
  attendanceId: string;
  position: number;
  estimatedWaitMinutes: number;
  professionalName: string;
  establishmentName: string;
  status: AttendanceStatus;
}

export type QueueNotificationType = 'ATTENDANCE_STARTED' | 'ATTENDANCE_FINISHED';

export interface QueueNotification {
  type: QueueNotificationType;
  attendanceId: string;
  establishmentId: string;
  message: string;
  timestamp: string;
}

export function canCancelAttendance(status: AttendanceStatus): boolean {
  return status === 'SCHEDULED';
}

/**
 * Decide se a tela de fila deve CRIAR um atendimento novo.
 * Só cria no fluxo "entrar na fila" (veio com serviços selecionados).
 * Re-entrar na tela (banner da Home/Atendimentos, sem serviços) nunca cria —
 * evita o erro "no service found" e filas-fantasma sem attendanceId.
 */
export function shouldCreateAttendance(params: {
  alreadyCreated: boolean;
  hasAttendanceId: boolean;
  hasToken: boolean;
  serviceItemIds?: string[];
}): boolean {
  const { alreadyCreated, hasAttendanceId, hasToken, serviceItemIds } = params;
  if (alreadyCreated || hasAttendanceId || !hasToken) return false;
  return (serviceItemIds?.length ?? 0) > 0;
}

/**
 * Reconcilia o countdown local com a estimativa do servidor mantendo-o
 * MONOTÔNICO (nunca pula pra cima a cada poll — o que causava o "tempo volta
 * pra 1h"). Retorna o novo âncora { enteredAt, estimatedMinutes } a aplicar, ou
 * `null` para manter como está (segue descontando localmente).
 *
 * - servidor indica MENOS tempo (fila andou) → re-ancora pra baixo.
 * - servidor indica MAIS tempo mas já zeramos localmente → re-ancora pra cima
 *   (evita mostrar "Agora" indevidamente quando ainda há espera real).
 * - servidor indica um pouco mais e ainda estamos descontando → ignora (sem pulo).
 * O sinal autoritativo de "é a sua vez" vem do WebSocket, não do zero local.
 */
export function reconcileQueueEstimate(
  current: { enteredAt: number; estimatedMinutes: number },
  serverEstimateMinutes: number,
  now: number,
): { enteredAt: number; estimatedMinutes: number } | null {
  const elapsedMin = (now - current.enteredAt) / 60000;
  const currentRemaining = current.estimatedMinutes - elapsedMin;

  if (serverEstimateMinutes <= currentRemaining || currentRemaining <= 0) {
    return { enteredAt: now, estimatedMinutes: serverEstimateMinutes };
  }
  return null;
}

export function isActiveAttendance(status: AttendanceStatus): boolean {
  return status === 'SCHEDULED' || status === 'IN_PROGRESS' || status === 'PAUSED';
}

/** Formata um Date como HH:MM (relógio local, 24h). */
export function formatClockTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Horário previsto de início do atendimento = agora + tempo de espera restante.
 * Retorna "HH:MM". Minutos negativos são tratados como 0 (previsão = agora).
 */
export function estimatedStartTime(nowMs: number, remainingMinutes: number): string {
  const safeMinutes = Math.max(0, remainingMinutes);
  return formatClockTime(new Date(nowMs + safeMinutes * 60000));
}

export function formatWaitTime(minutes: number): string {
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
}
