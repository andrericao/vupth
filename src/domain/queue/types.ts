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
