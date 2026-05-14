import { mock } from './setup';
import { api } from '../../services/api';

describe('Establishment Integration', () => {
  describe('GET /establishment', () => {
    it('deve listar todos os estabelecimentos', async () => {
      mock.onGet('/establishment').reply(200, [
        {
          id: 'est-1',
          name: 'Barbearia Top',
          serviceType: 'BARBER',
          isOpen: true,
          serviceItems: [
            { id: 's1', serviceItemType: 'CORTE_MAQUINA', customName: 'Corte Degradê', price: 35.0, estimatedMinutes: 30 },
          ],
        },
        {
          id: 'est-2',
          name: 'Salão Beleza Pura',
          serviceType: 'BEAUTY_SALON',
          isOpen: true,
          serviceItems: [],
        },
      ]);

      const response = await api.get('/establishment');

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].name).toBe('Barbearia Top');
      expect(response.data[0].serviceItems).toHaveLength(1);
      expect(response.data[1].name).toBe('Salão Beleza Pura');
      expect(response.data[1].serviceItems).toHaveLength(0);
    });

    it('deve retornar lista vazia quando não há estabelecimentos', async () => {
      mock.onGet('/establishment').reply(200, []);

      const response = await api.get('/establishment');

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(0);
    });
  });

  describe('GET /establishment/id/:id', () => {
    it('deve retornar estabelecimento por ID', async () => {
      mock.onGet('/establishment/id/est-1').reply(200, {
        id: 'est-1',
        name: 'Barbearia Top',
        serviceType: 'BARBER',
        isOpen: true,
        serviceItems: [
          { id: 's1', serviceItemType: 'CORTE_MAQUINA', customName: 'Corte Degradê', price: 35.0, estimatedMinutes: 30 },
        ],
      });

      const response = await api.get('/establishment/id/est-1');

      expect(response.status).toBe(200);
      expect(response.data.id).toBe('est-1');
      expect(response.data.name).toBe('Barbearia Top');
      expect(response.data.serviceType).toBe('BARBER');
      expect(response.data.serviceItems[0].price).toBe(35.0);
    });

    it('deve retornar 404 para ID inexistente', async () => {
      mock.onGet('/establishment/id/nao-existe').reply(404, {
        message: 'Establishment not found',
      });

      try {
        await api.get('/establishment/id/nao-existe');
        fail('deveria ter lançado erro');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toBe('Establishment not found');
      }
    });
  });

  describe('GET /establishment/id/:id/professionals-with-queue', () => {
    it('deve retornar profissionais com fila do estabelecimento', async () => {
      mock.onGet('/establishment/id/est-1/professionals-with-queue').reply(200, [
        {
          id: 'prof-1',
          name: 'Carlos Silva',
          specialty: 'BARBER',
          isAvailable: true,
          estimatedWaitMinutes: 15,
          attendancesInQueue: [
            { id: 'att-1', position: 1, estimatedWaitMinutes: 15 },
          ],
        },
      ]);

      const response = await api.get('/establishment/id/est-1/professionals-with-queue');

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(1);
      expect(response.data[0].name).toBe('Carlos Silva');
      expect(response.data[0].isAvailable).toBe(true);
      expect(response.data[0].estimatedWaitMinutes).toBe(15);
      expect(response.data[0].attendancesInQueue).toHaveLength(1);
    });

    it('deve retornar lista vazia para estabelecimento sem profissionais', async () => {
      mock.onGet('/establishment/id/est-2/professionals-with-queue').reply(200, []);

      const response = await api.get('/establishment/id/est-2/professionals-with-queue');

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(0);
    });
  });
});
