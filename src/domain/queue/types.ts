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

export function isActiveAttendance(status: AttendanceStatus): boolean {
  return status === 'SCHEDULED' || status === 'IN_PROGRESS' || status === 'PAUSED';
}

export function formatWaitTime(minutes: number): string {
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
}
