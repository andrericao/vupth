import { mock } from './setup';
import { api } from '../../services/api';

describe('Auth Integration', () => {
  describe('POST /auth/register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      mock.onPost('/auth/register').reply(201, {
        id: 'user-uuid-1',
        email: 'novo@test.com',
        created_at: '2026-05-09T10:00:00Z',
        user_roles: ['CLIENT'],
      });

      const response = await api.post('/auth/register', {
        email: 'novo@test.com',
        password: 'senha123',
      });

      expect(response.status).toBe(201);
      expect(response.data.email).toBe('novo@test.com');
      expect(response.data.user_roles).toContain('CLIENT');
      expect(response.data.id).toBeDefined();
    });

    it('deve retornar 400 sem email', async () => {
      mock.onPost('/auth/register').reply(400, {
        message: 'Email and password are required',
      });

      try {
        await api.post('/auth/register', { password: 'senha123' });
        fail('deveria ter lançado erro');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('Email and password are required');
      }
    });

    it('deve retornar 400 sem password', async () => {
      mock.onPost('/auth/register').reply(400, {
        message: 'Email and password are required',
      });

      try {
        await api.post('/auth/register', { email: 'novo@test.com' });
        fail('deveria ter lançado erro');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('POST /auth/login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      mock.onPost('/auth/login').reply(200, {
        user: { id: 'user-uuid-1', email: 'cliente@test.com', roles: ['CLIENT'] },
        tokens: { access_token: 'mock-jwt', refresh_token: 'mock-refresh', expires_in: 3600 },
      });

      const response = await api.post('/auth/login', {
        email: 'cliente@test.com',
        password: 'senha123',
      });

      expect(response.status).toBe(200);
      expect(response.data.user.email).toBe('cliente@test.com');
      expect(response.data.user.roles).toContain('CLIENT');
      expect(response.data.tokens.access_token).toBeDefined();
      expect(response.data.tokens.refresh_token).toBeDefined();
      expect(response.data.tokens.expires_in).toBe(3600);
    });

    it('deve retornar 401 com senha incorreta', async () => {
      mock.onPost('/auth/login').reply(401, {
        message: 'Invalid credentials',
      });

      try {
        await api.post('/auth/login', {
          email: 'cliente@test.com',
          password: 'wrongpassword',
        });
        fail('deveria ter lançado erro');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toBe('Invalid credentials');
      }
    });

    it('deve retornar 400 sem campos obrigatórios', async () => {
      mock.onPost('/auth/login').reply(400, {
        message: 'Email and password are required',
      });

      try {
        await api.post('/auth/login', {});
        fail('deveria ter lançado erro');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('POST /auth/refresh', () => {
    it('deve renovar tokens com refresh_token válido', async () => {
      mock.onPost('/auth/refresh').reply(200, {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      });

      const response = await api.post('/auth/refresh', {
        refresh_token: 'mock-refresh-token',
      });

      expect(response.status).toBe(200);
      expect(response.data.access_token).toBe('new-access-token');
      expect(response.data.refresh_token).toBe('new-refresh-token');
      expect(response.data.expires_in).toBe(3600);
    });

    it('deve retornar 400 sem refresh_token', async () => {
      mock.onPost('/auth/refresh').reply(400, {
        message: 'Refresh token is required',
      });

      try {
        await api.post('/auth/refresh', {});
        fail('deveria ter lançado erro');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('Refresh token is required');
      }
    });
  });

  describe('POST /auth/logout', () => {
    it('deve fazer logout com token válido', async () => {
      mock.onPost('/auth/logout').reply(204);

      const response = await api.post('/auth/logout', null, {
        headers: { Authorization: 'Bearer mock-access-token-jwt' },
      });

      expect(response.status).toBe(204);
    });

    it('deve retornar 401 sem token de autorização', async () => {
      mock.onPost('/auth/logout').reply(401, {
        message: 'Unauthorized',
      });

      try {
        await api.post('/auth/logout');
        fail('deveria ter lançado erro');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toBe('Unauthorized');
      }
    });
  });
});
