import { api } from './api';

// Um atendimento na fila de espera (subconjunto do AttendanceInQueueResponse).
export interface QueueMember {
  id: string;
  clientId: string | null;
  clientName: string | null;
  status: string;
  scheduledTime: string;
  estimatedMinutes: number | null;
  isIntent: boolean;
  targetTime: string | null;
}

export interface QueueResponse {
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  establishmentName: string;
  size: number;
  attendancesInQueue: QueueMember[];
  totalEstimatedMinutes: number;
  totalElapsedMinutes: number;
  totalRemainingMinutes: number;
}

export interface WaitTimeResponse {
  attendanceId: string;
  clientId: string;
  position: number;
  totalQueueSize: number;
  totalEstimatedMinutes: number;
  totalRemainingMinutes: number;
  estimatedWaitingTime: number;
  startTime: string;
}

export const queueService = {
  getQueue(professionalId: string, establishmentId: string, accessToken: string) {
    return api.get<QueueResponse>(
      `/client-queue/${professionalId}/queue`,
      {
        params: { establishmentId },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  },

  getWaitTime(attendanceId: string, clientId: string, accessToken: string) {
    return api.get<WaitTimeResponse>(
      `/client-queue/${attendanceId}/wait-time`,
      {
        params: { clientId },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  },
};
