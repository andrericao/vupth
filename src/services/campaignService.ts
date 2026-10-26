import { api } from './api';

// Campanhas e cupons (Backend 4a94610, promocao-de-lancamento v2). Os campos
// abaixo sao os que a tela usa; o resto da campanha passa sem uso.
export interface Campanha {
  id: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  /** REFERRAL_BONUS = campanha de link; as outras sao cupom, desconto ou isencao. */
  type?: string | null;
  benefit?: string | null;
  /** Dias em que vale, ex.: "TUESDAY,WEDNESDAY"; vazio = todos. */
  weekdays?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  remaining_slots?: number | null;
  // Meus cupons (Backend 5de02e0, cupom-ativado-em-configuracoes).
  status?: 'ACTIVE' | 'USED' | 'EXPIRED' | null;
  used?: boolean | null;
  value_amount?: number | null;
  value_percent?: number | null;
  /** WITH_FEE = o preco que o cliente ve; WITHOUT_FEE = o que o profissional recebe. */
  benefit_base?: 'WITH_FEE' | 'WITHOUT_FEE' | null;
}

export const campaignService = {
  // Logado: 201 com a campanha. Recusas: 404 CAMPAIGN_NOT_FOUND, 409
  // CAMPAIGN_NOT_AVAILABLE / CAMPAIGN_ALREADY_REDEEMED, 403 CAMPAIGN_NOT_FOR_YOU.
  redeem(code: string, accessToken: string) {
    return api.post<Campanha>('/campaigns/redeem', { code }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  // Participar de uma campanha de link (compartilhe-e-ganhe, Backend fcd4fd3):
  // 201; 404 campanha inexistente ou privada; 403/409 como o redeem.
  join(id: string, accessToken: string) {
    return api.post<Campanha>(`/campaigns/${id}/join`, undefined, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  // Home (carrossel-de-campanhas-na-home, Backend d0d631e): so as publicas, em
  // andamento e do papel de quem esta logado; a que acaba primeiro vem antes.
  listActive(accessToken: string) {
    return api.get<Campanha[]>('/campaigns/active', {
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
