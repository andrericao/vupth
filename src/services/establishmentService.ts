import { api } from './api';
import { Establishment } from '@domain/establishment/types';
import { ProfessionalWithQueue, ServiceItemResponse } from '@domain/professional/types';

export interface EstablishmentWithProfessionals {
  id: string;
  name: string;
  url_image: string | null;
  services: string[];
  owner_id: string;
  open_status: string;
  total_in_queue: number;
  available_professionals: number;
  professionals: ProfessionalWithQueue[];
}

export const establishmentService = {
  getAll() {
    return api.get<Establishment[]>('/establishment');
  },

  getById(id: string) {
    return api.get<Establishment>(`/establishment/id/${id}`);
  },

  getProfessionalsWithQueue(establishmentId: string) {
    return api.get<EstablishmentWithProfessionals>(
      `/establishment/id/${establishmentId}/professionals-with-queue`,
    );
  },

  getServiceItemsByProfessional(professionalId: string) {
    return api.get<ServiceItemResponse[]>(
      `/professional-queue/${professionalId}/service-items`,
    );
  },
};
