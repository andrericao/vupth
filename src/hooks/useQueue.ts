import { useQuery } from '@tanstack/react-query';
import { queueService } from '../services/queueService';

export function useQueuePosition(professionalId: string) {
  return useQuery({
    queryKey: ['queue-position', professionalId],
    queryFn: () => queueService.getPosition(professionalId).then((res) => res.data),
    enabled: !!professionalId,
    refetchInterval: 15000,
  });
}
