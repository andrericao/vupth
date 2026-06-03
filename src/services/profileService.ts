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

  updatePassword(password: string, accessToken: string) {
    return api.patch<UserProfileAndTokenResponse>('/profile/update-password/me', { password }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  deleteAccount(accessToken: string) {
    return api.delete('/profile/delete/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
