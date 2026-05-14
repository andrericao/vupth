import { mock } from './setup';
import { api } from '../../services/api';

describe('Queue Integration', () => {
  describe('GET /client-queue/:profId/queue', () => {
    it('deve retornar posição na fila do profissional', async () => {
      mock.onGet('/client-queue/prof-1/queue').reply(200, {
        position: 3,
        estimatedWaitMinutes: 45,
      });

      const response = await api.get('/client-queue/prof-1/queue');

      expect(response.status).toBe(200);
      expect(response.data.position).toBe(3);
      expect(response.data.estimatedWaitMinutes).toBe(45);
    });

    it('deve retornar posição 1 quando é o próximo', async () => {
      mock.onGet('/client-queue/prof-1/queue').reply(200, {
        position: 1,
        estimatedWaitMinutes: 0,
      });

      const response = await api.get('/client-queue/prof-1/queue');

      expect(response.status).toBe(200);
      expect(response.data.position).toBe(1);
      expect(response.data.estimatedWaitMinutes).toBe(0);
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
        expect(error.response.data.message).toBe('Professional not found');
      }
    });
  });
});
