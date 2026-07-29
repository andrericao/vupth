import { api } from './api';

export interface UpdateGeneralInfosRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  birth_date?: string;
  gender?: 'FEMALE' | 'MALE' | 'NON_BINARY' | 'OTHERS';
  profile_image_url?: string;
}

export interface UserProfileResponse {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  profile_image_url: string | null;
  created_at: string;
  user_roles: string[];
  modified_fields: string[];
}

export interface UserProfileAndTokenResponse {
  user: UserProfileResponse;
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export const profileService = {
  updateGeneralInfos(data: UpdateGeneralInfosRequest, accessToken: string) {
    return api.patch<UserProfileResponse>('/profile/general-infos', data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  updateEmail(email: string, accessToken: string) {
    return api.patch<UserProfileAndTokenResponse>('/profile/update-email/me', { email }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  // Troca de senha exige provar a senha atual (backend 2026-07-22): senha errada →
  // 401 CURRENT_PASSWORD_INVALID (erro de campo — o interceptor NÃO desloga);
  // campo ausente → 422 VALIDATION_ERROR.
  updatePassword(currentPassword: string, password: string, accessToken: string) {
    return api.patch<UserProfileAndTokenResponse>(
      '/profile/update-password/me',
      { current_password: currentPassword, password },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  },

  deleteAccount(accessToken: string) {
    return api.delete('/profile/delete/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
