import { api } from './api';
import { Establishment } from '@domain/establishment/types';
import { Coords } from '@domain/location/gps';
import { ProfessionalWithQueue, ServiceItemResponse } from '@domain/professional/types';
import { HorariosDaLoja } from '@domain/establishment/horarios';

export interface EstablishmentWithProfessionals {
  id: string;
  name: string;
  url_image: string | null;
  services: string[];
  owner_id: string;
  open_status: string;
  // "Aberta agora" efetiva (open_status OPEN E dentro do horário — BUG5 B).
  is_open?: boolean;
  total_in_queue: number;
  available_professionals: number;
  professionals: ProfessionalWithQueue[];
}

export const establishmentService = {
  /**
   * Horário por DIA da semana (C22) — contrato de 16/09, no ar em staging
   * desde 17/09. Rota PÚBLICA: o cliente lê sem token.
   */
  getHours(establishmentId: string) {
    return api.get<HorariosDaLoja>(`/establishment/${establishmentId}/hours`);
  },

  /**
   * Listagem da Home. Com `coords`, o BACKEND ordena por distância e devolve
   * `distance_km` em cada item (fatia B do GPS, 2026-08-01).
   *
   * `radiusKm` NÃO é enviado de propósito: não existe raio default (decisão do
   * Andre, 2026-07-27). Sem raio, ninguém some da lista — a loja ainda não
   * geocodificada vai para o fim com `distance_km: null`. Com raio, ela SAIRIA,
   * e o cliente leria "não há lojas" onde na verdade há.
   */
  getAll(coords?: Coords | null) {
    // A listagem ja traz as FECHADAS por padrao (Backend, em producao desde
    // 17/09) — o cliente pode agendar para a reabertura. O `includeAll` saiu.
    return api.get<Establishment[]>('/establishment', {
      params: {
        // Tem de ir o PAR: coordenada pela metade é 422 no backend.
        ...(coords ? { lat: coords.latitude, lng: coords.longitude } : {}),
      },
    });
  },

  /**
   * Busca "Pra ontem" (Andre, 26/09): so as lojas ABERTAS AGORA e com
   * profissional com servico — o corte e os filtros sao do servidor (06/09).
   * Com `coords` vem a distancia; a ordem final (quem atende primeiro,
   * contando o caminho) e do app — `domain/establishment/praOntem`.
   */
  getPraOntem(coords?: Coords | null) {
    return api.get<Establishment[]>('/establishment', {
      params: {
        openNow: true,
        hasAvailability: true,
        sort: 'wait',
        // Tem de ir o PAR: coordenada pela metade é 422 no backend.
        ...(coords ? { lat: coords.latitude, lng: coords.longitude } : {}),
      },
    });
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
