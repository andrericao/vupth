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
    // includeAll=true: traz tambem os FECHADOS (por padrao a listagem publica so
    // retorna abertos — BUG5 do backend). O cliente pode querer manifestar
    // interesse/agendar para a reabertura; o front ordena os fechados por ultimo.
    return api.get<Establishment[]>('/establishment', { params: { includeAll: true } });
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
      `/professional/${professionalId}/service-items`,
    );
  },
};
