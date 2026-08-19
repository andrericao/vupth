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

  // Contrato NOVO (backend S19, 2026-08-07): a rota antiga era destrutiva
  // (`cascade = ALL` — apagar a conta de um dono apagava a loja inteira) e virou
  // anonimizacao, exigindo a senha atual NO CORPO. Mandavamos DELETE sem corpo
  // => `400 INVALID_REQUEST_BODY`, e o botao ficou quebrado em producao.
  describe('DELETE /profile/delete/me', () => {
    it('MANDA a senha atual no corpo — sem ela o backend responde 400', async () => {
      let corpo: unknown;
      mock.onDelete('/profile/delete/me').reply((config) => {
        corpo = JSON.parse(config.data);
        return [204, null];
      });

      const response = await profileService.deleteAccount(token, 'Senha@123');

      expect(corpo).toEqual({ current_password: 'Senha@123' });
      expect(response.status).toBe(204);
    });

    it('deve enviar Authorization header', async () => {
      mock.onDelete('/profile/delete/me').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer del-token');
        return [204, null];
      });

      await profileService.deleteAccount('del-token', 'Senha@123');
    });

    it('propaga o 401 de senha errada SEM deslogar (erro de campo)', async () => {
      // O interceptor global isenta `CURRENT_PASSWORD_INVALID` do fluxo de
      // sessao expirada; se um dia deixar de isentar, a tela desloga o usuario
      // no meio do fluxo em vez de dizer "senha incorreta".
      mock
        .onDelete('/profile/delete/me')
        .reply(401, { code: 'CURRENT_PASSWORD_INVALID', message: 'senha incorreta' });

      await expect(
        profileService.deleteAccount(token, 'errada'),
      ).rejects.toMatchObject({
        response: { status: 401, data: { code: 'CURRENT_PASSWORD_INVALID' } },
      });
    });

    it('propaga o 409 com a mensagem que diz COMO destravar', async () => {
      mock.onDelete('/profile/delete/me').reply(409, {
        code: 'ACCOUNT_DELETE_NOT_ALLOWED',
        message: 'Saia da fila para apagar a conta.',
      });

      await expect(
        profileService.deleteAccount(token, 'Senha@123'),
      ).rejects.toMatchObject({
        response: { status: 409, data: { message: 'Saia da fila para apagar a conta.' } },
      });
    });
  });
});
