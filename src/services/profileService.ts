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

  /**
   * Apaga a conta do titular. **Contrato NOVO desde 2026-08-07** (backend S19):
   * a rota antiga era destrutiva (`cascade = ALL` — apagar a conta de um dono
   * apagava a loja inteira) e virou **anonimização**, exigindo a senha atual.
   *
   * Mandávamos `DELETE` **sem corpo**, o que passou a devolver
   * `400 INVALID_REQUEST_BODY`: o botão ficou quebrado em produção.
   *
   * Respostas: `204` sucesso · `401 CURRENT_PASSWORD_INVALID` (erro de CAMPO —
   * o interceptor global não desloga, ver `api.ts`) · `409
   * ACCOUNT_DELETE_NOT_ALLOWED` (bloqueio TEMPORÁRIO: a mensagem do backend diz
   * o que fazer para destravar e precisa ser exibida como veio) ·
   * `422 VALIDATION_ERROR` (senha em branco).
   *
   * Depois do 204 a conta **para de autenticar no request seguinte** — o token
   * na mão do app morre na hora, não espera expirar.
   */
  deleteAccount(accessToken: string, currentPassword: string) {
    return api.delete('/profile/delete/me', {
      // `data` no DELETE: sem corpo o backend responde 400.
      data: { current_password: currentPassword },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  /**
   * Desativa a conta (reversivel; desativar-conta, Backend). Senha atual no corpo,
   * como no apagar: `204` sucesso · `401 CURRENT_PASSWORD_INVALID` (erro de campo) ·
   * `409 ACCOUNT_DEACTIVATE_NOT_ALLOWED` (compromisso vivo: mostrar a mensagem do servidor).
   */
  deactivateAccount(accessToken: string, currentPassword: string) {
    return api.post('/profile/deactivate/me', { current_password: currentPassword }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
