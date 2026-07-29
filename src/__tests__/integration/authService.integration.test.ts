import { mock } from './setup';
import { authService } from '../../services/authService';

describe('AuthService', () => {
  it('register deve chamar POST /auth/register', async () => {
    mock.onPost('/auth/register').reply(201, {
      id: 'user-1',
      email: 'novo@test.com',
      created_at: '2026-05-14T10:00:00Z',
      user_roles: ['CLIENT'],
    });

    const response = await authService.register({ email: 'novo@test.com', password: '123456' });

    expect(response.status).toBe(201);
    expect(response.data.email).toBe('novo@test.com');
  });

  it('login deve retornar user e tokens', async () => {
    mock.onPost('/auth/login').reply(200, {
      user: { id: 'user-1', email: 'test@test.com', roles: ['CLIENT'] },
      tokens: { access_token: 'jwt', refresh_token: 'refresh', expires_in: 3600 },
    });

    const response = await authService.login({ email: 'test@test.com', password: '123456' });

    expect(response.data.user.email).toBe('test@test.com');
    expect(response.data.tokens.access_token).toBe('jwt');
  });

  it('refresh deve enviar refresh_token no body', async () => {
    mock.onPost('/auth/refresh').reply(200, {
      access_token: 'new-jwt',
      refresh_token: 'new-refresh',
      expires_in: 3600,
    });

    const response = await authService.refresh('old-refresh');

    expect(response.data.access_token).toBe('new-jwt');
  });

  it('logout deve enviar Bearer token no header', async () => {
    mock.onPost('/auth/logout').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      return [204, null];
    });

    const response = await authService.logout('my-token');

    expect(response.status).toBe(204);
  });

  // Esqueci minha senha (fatia 1 do backend, 2026-07-22)
  it('forgotPassword envia { email } e aceita o 200 anti-enumeração', async () => {
    mock.onPost('/auth/forgot-password').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ email: 'user@test.com' });
      return [200, null];
    });

    const response = await authService.forgotPassword('user@test.com');

    expect(response.status).toBe(200);
  });

  it('resetPassword envia { email, code, new_password }', async () => {
    mock.onPost('/auth/reset-password').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        email: 'user@test.com',
        code: '123456',
        new_password: 'NovaSenha123',
      });
      return [200, null];
    });

    const response = await authService.resetPassword('user@test.com', '123456', 'NovaSenha123');

    expect(response.status).toBe(200);
  });

  it('resetPassword propaga 400 RESET_CODE_INVALID / RESET_CODE_EXPIRED', async () => {
    mock.onPost('/auth/reset-password').replyOnce(400, { code: 'RESET_CODE_INVALID' });
    await expect(
      authService.resetPassword('user@test.com', '000000', 'NovaSenha123'),
    ).rejects.toMatchObject({ response: { status: 400, data: { code: 'RESET_CODE_INVALID' } } });

    mock.onPost('/auth/reset-password').replyOnce(400, { code: 'RESET_CODE_EXPIRED' });
    await expect(
      authService.resetPassword('user@test.com', '123456', 'NovaSenha123'),
    ).rejects.toMatchObject({ response: { status: 400, data: { code: 'RESET_CODE_EXPIRED' } } });
  });
});
