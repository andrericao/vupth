import { useQuery } from '@tanstack/react-query';
import { establishmentService } from '../services/establishmentService';

export function useEstablishments() {
  return useQuery({
    queryKey: ['establishments'],
    queryFn: () => establishmentService.getAll().then((res) => res.data),
    staleTime: 60000,
    retry: 2,
    retryDelay: (attempt) => Math.min(3000 * (attempt + 1), 10000),
  });
}

export function useEstablishment(id: string) {
  return useQuery({
    queryKey: ['establishment', id],
    queryFn: () => establishmentService.getById(id).then((res) => res.data),
    enabled: !!id,
    staleTime: 60000,
  });
}

export function useProfessionalsWithQueue(establishmentId: string) {
  return useQuery({
    queryKey: ['professionals-with-queue', establishmentId],
    queryFn: () =>
      establishmentService
        .getProfessionalsWithQueue(establishmentId)
        .then((res) => res.data.professionals ?? []),
    enabled: !!establishmentId,
    staleTime: 30000,
  });
}
