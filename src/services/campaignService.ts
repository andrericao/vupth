import { api } from './api';

// Campanhas e cupons (Backend 4a94610, promocao-de-lancamento v2). Os campos
// abaixo sao os que a tela usa; o resto da campanha passa sem uso.
export interface Campanha {
  id: string;
  code?: string | null;
  name?: string | null;
}

export const campaignService = {
  // Logado: 201 com a campanha. Recusas: 404 CAMPAIGN_NOT_FOUND, 409
  // CAMPAIGN_NOT_AVAILABLE / CAMPAIGN_ALREADY_REDEEMED, 403 CAMPAIGN_NOT_FOR_YOU.
  redeem(code: string, accessToken: string) {
    return api.post<Campanha>('/campaigns/redeem', { code }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  // Os cupons que a pessoa aceitou.
  listMine(accessToken: string) {
    return api.get<Campanha[]>('/campaigns/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
