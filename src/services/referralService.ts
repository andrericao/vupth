import { api } from './api';

// Indicacao (Backend 3fdcec1, fcd4fd3): o cliente que chegou pelo link de uma
// pessoa fica ligado a ela; quem tem campanha de link tambem indica.
export interface CampanhaDeLink {
  campaign_id: string;
  name?: string | null;
  /** O link pessoal da pessoa nesta campanha (termina em ?c=<campanha>). */
  link: string;
  ends_at?: string | null;
  /** Os campos reais do Backend (ReferralMeResponse.CampaignLink): clientes que chegaram e com credito. */
  referred_clients?: number | null;
  credited_clients?: number | null;
}

export interface MinhasIndicacoes {
  /** O codigo e o link da pessoa (sem campanha) e os totais dela. */
  code?: string | null;
  link?: string | null;
  referred_clients?: number | null;
  credited_clients?: number | null;
  to_receive?: number | null;
  campaigns: CampanhaDeLink[];
  /** Ganho que espera o Andre liberar no Painel (R$). */
  pending_release?: number | null;
}

export const referralService = {
  // 200 {code, referred_at, campaign_id}. `campaignId` e a campanha do link (?c=); sem ela o registro existe mas nao paga.
  claim(code: string, accessToken: string, campaignId?: string | null) {
    return api.post<{ code: string; referred_at: string; campaign_id?: string | null }>(
      '/referrals/claim',
      campaignId ? { code, campaign_id: campaignId } : { code },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  },

  me(accessToken: string) {
    return api.get<MinhasIndicacoes>('/referrals/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
