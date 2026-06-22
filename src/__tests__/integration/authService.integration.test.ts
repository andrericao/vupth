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
});
