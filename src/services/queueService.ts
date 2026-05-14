import { api } from './api';

export interface QueuePositionResponse {
  position: number;
  estimatedWaitMinutes: number;
}

export const queueService = {
  getPosition(professionalId: string) {
    return api.get<QueuePositionResponse>(`/client-queue/${professionalId}/queue`);
  },
};
