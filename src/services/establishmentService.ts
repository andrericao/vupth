import { api } from './api';
import { Establishment } from '@domain/establishment/types';
import { ProfessionalWithQueue } from '@domain/professional/types';

export const establishmentService = {
  getAll() {
    return api.get<Establishment[]>('/establishment');
  },

  getById(id: string) {
    return api.get<Establishment>(`/establishment/id/${id}`);
  },

  getProfessionalsWithQueue(establishmentId: string) {
    return api.get<ProfessionalWithQueue[]>(
      `/establishment/id/${establishmentId}/professionals-with-queue`,
    );
  },
};
