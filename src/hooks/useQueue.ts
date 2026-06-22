import { useQuery } from '@tanstack/react-query';
import { queueService } from '../services/queueService';

export function useQueueInfo(
  professionalId: string,
  establishmentId: string,
  accessToken: string | null,
) {
  return useQuery({
    queryKey: ['queue-info', professionalId, establishmentId],
    queryFn: () =>
      queueService
        .getQueue(professionalId, establishmentId, accessToken!)
        .then((res) => res.data),
    enabled: !!professionalId && !!establishmentId && !!accessToken,
    staleTime: 30000,
  });
}

export function useWaitTime(
  attendanceId: string | undefined,
  clientId: string | undefined,
  accessToken: string | null,
) {
  return useQuery({
    queryKey: ['wait-time', attendanceId],
    queryFn: () =>
      queueService
        .getWaitTime(attendanceId!, clientId!, accessToken!)
        .then((res) => res.data),
    enabled: !!attendanceId && !!clientId && !!accessToken,
    staleTime: 30000,
  });
}
