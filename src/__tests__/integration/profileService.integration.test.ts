import { mock } from './setup';
import { profileService } from '../../services/profileService';

describe('ProfileService', () => {
  const token = 'test-token';

  describe('PATCH /profile/general-infos', () => {
    it('deve atualizar dados gerais do perfil', async () => {
      mock.onPatch('/profile/general-infos').reply(200, {
        id: 'user-1',
        first_name: 'Andre',
        last_name: 'Ricao',
        email: 'andre@test.com',
        phone: '11999998888',
        birth_date: '1990-01-15',
        gender: 'MALE',
        profile_image_url: null,
        modified_fields: ['first_name', 'last_name'],
      });

      const { data } = await profileService.updateGeneralInfos(
        { first_name: 'Andre', last_name: 'Ricao' },
        token,
      );

      expect(data.first_name).toBe('Andre');
      expect(data.modified_fields).toContain('first_name');
    });

    it('deve enviar Authorization header', async () => {
      mock.onPatch('/profile/general-infos').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer my-token');
        return [200, { id: 'user-1', modified_fields: [] }];
      });

      await profileService.updateGeneralInfos({ phone: '123' }, 'my-token');
    });
  });

  describe('PATCH /profile/update-email/me', () => {
    it('deve atualizar email e retornar novos tokens', async () => {
      mock.onPatch('/profile/update-email/me').reply(200, {
        user: { id: 'user-1', email: 'novo@test.com' },
        tokens: { access_token: 'new-at', refresh_token: 'new-rt', expires_in: 3600 },
      });

      const { data } = await profileService.updateEmail('novo@test.com', token);

      expect(data.user.email).toBe('novo@test.com');
      expect(data.tokens.access_token).toBe('new-at');
    });
  });

  describe('PATCH /profile/update-password/me', () => {
    it('deve enviar current_password + password e retornar novos tokens', async () => {
      mock.onPatch('/profile/update-password/me').reply((config) => {
        expect(JSON.parse(config.data)).toEqual({
          current_password: 'senhaAtual123',
          password: 'novaSenha123',
        });
        return [
          200,
          {
            user: { id: 'user-1', email: 'user@test.com' },
            tokens: { access_token: 'new-at', refresh_token: 'new-rt', expires_in: 3600 },
          },
        ];
      });

      const { data } = await profileService.updatePassword('senhaAtual123', 'novaSenha123', token);

      expect(data.tokens.access_token).toBe('new-at');
    });

    it('senha atual errada propaga 401 CURRENT_PASSWORD_INVALID (sem virar logout)', async () => {
      mock.onPatch('/profile/update-password/me').reply(401, { code: 'CURRENT_PASSWORD_INVALID' });

      await expect(
        profileService.updatePassword('errada', 'novaSenha123', token),
      ).rejects.toMatchObject({ response: { status: 401, data: { code: 'CURRENT_PASSWORD_INVALID' } } });
    });
  });

  describe('DELETE /profile/delete/me', () => {
    it('deve deletar a conta', async () => {
      mock.onDelete('/profile/delete/me').reply(200);

      const response = await profileService.deleteAccount(token);
      expect(response.status).toBe(200);
    });

    it('deve enviar Authorization header', async () => {
      mock.onDelete('/profile/delete/me').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer del-token');
        return [200, null];
      });

      await profileService.deleteAccount('del-token');
    });
  });
});
