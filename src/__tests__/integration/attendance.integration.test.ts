import { mock } from './setup';
import { api } from '../../services/api';

const AUTH_HEADER = { Authorization: 'Bearer mock-access-token-jwt' };

describe('Attendance Integration', () => {
  describe('POST /attendances', () => {
    it('deve criar um agendamento com token válido', async () => {
      mock.onPost('/attendances').reply(201, {
        id: 'att-new-1',
        clientId: 'user-uuid-1',
        professionalId: 'prof-1',
        establishmentId: 'est-1',
        status: 'SCHEDULED',
        scheduledTime: '2026-05-14T10:00:00Z',
      });

      const response = await api.post(
        '/attendances',
        { professionalId: 'prof-1', establishmentId: 'est-1', serviceItemIds: ['s1'] },
        { headers: AUTH_HEADER },
      );

      expect(response.status).toBe(201);
      expect(response.data.id).toBe('att-new-1');
      expect(response.data.status).toBe('SCHEDULED');
      expect(response.data.professionalId).toBe('prof-1');
      expect(response.data.establishmentId).toBe('est-1');
    });

    it('deve retornar 401 sem token de autorização', async () => {
      mock.onPost('/attendances').reply(401, {
        message: 'Unauthorized',
      });

      try {
        await api.post('/attendances', { professionalId: 'prof-1' });
        fail('deveria ter lançado erro');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toBe('Unauthorized');
      }
    });
  });

  describe('PUT /attendances/:id/cancel', () => {
    it('deve cancelar um agendamento com token válido', async () => {
      mock.onPut('/attendances/att-new-1/cancel').reply(200, {
        id: 'att-new-1',
        status: 'CANCELLED',
      });

      const response = await api.put(
        '/attendances/att-new-1/cancel',
        null,
        { headers: AUTH_HEADER },
      );

      expect(response.status).toBe(200);
      expect(response.data.id).toBe('att-new-1');
      expect(response.data.status).toBe('CANCELLED');
    });

    it('deve retornar 401 sem token de autorização', async () => {
      mock.onPut('/attendances/att-new-1/cancel').reply(401, {
        message: 'Unauthorized',
      });

      try {
        await api.put('/attendances/att-new-1/cancel');
        fail('deveria ter lançado erro');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toBe('Unauthorized');
      }
    });
  });
});
