import { mock } from './setup';
import { api } from '../../services/api';

describe('Queue Integration', () => {
  describe('GET /client-queue/:profId/queue', () => {
    it('deve retornar fila do profissional com establishmentId', async () => {
      mock.onGet('/client-queue/prof-1/queue').reply(200, {
        professionalId: 'prof-1',
        professionalName: 'Carlos',
        establishmentId: 'est-1',
        establishmentName: 'Barbearia',
        size: 3,
        totalEstimatedMinutes: 90,
        totalRemainingMinutes: 75,
      });

      const response = await api.get('/client-queue/prof-1/queue', {
        params: { establishmentId: 'est-1' },
      });

      expect(response.status).toBe(200);
      expect(response.data.size).toBe(3);
      expect(response.data.totalRemainingMinutes).toBe(75);
    });

    it('deve retornar fila vazia', async () => {
      mock.onGet('/client-queue/prof-1/queue').reply(200, {
        size: 0,
        totalEstimatedMinutes: 0,
        totalRemainingMinutes: 0,
      });

      const response = await api.get('/client-queue/prof-1/queue');
      expect(response.data.size).toBe(0);
    });

    it('deve retornar 404 para profissional inexistente', async () => {
      mock.onGet('/client-queue/prof-inexistente/queue').reply(404, {
        message: 'Professional not found',
      });

      try {
        await api.get('/client-queue/prof-inexistente/queue');
        fail('deveria ter lançado erro');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('GET /client-queue/:attendanceId/wait-time', () => {
    it('deve retornar tempo de espera do cliente', async () => {
      mock.onGet('/client-queue/att-1/wait-time').reply(200, {
        attendanceId: 'att-1',
        clientId: 'cli-1',
        position: 2,
        totalQueueSize: 5,
        estimatedWaitingTime: 40,
        totalRemainingMinutes: 60,
      });

      const response = await api.get('/client-queue/att-1/wait-time', {
        params: { clientId: 'cli-1' },
      });

      expect(response.status).toBe(200);
      expect(response.data.estimatedWaitingTime).toBe(40);
    });
  });
});
