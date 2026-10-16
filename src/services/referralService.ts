import { api } from './api';

// Indicacao (Backend 3fdcec1): o cliente que chegou pelo link de um
// profissional ou dono fica ligado a ele. 200 {code, referred_at}.
export const referralService = {
  claim(code: string, accessToken: string) {
    return api.post<{ code: string; referred_at: string }>('/referrals/claim', { code }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
