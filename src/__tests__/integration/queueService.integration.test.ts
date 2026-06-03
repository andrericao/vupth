import { mock } from './setup';
import { queueService } from '../../services/queueService';

describe('QueueService', () => {
  it('getQueue deve retornar fila do profissional', async () => {
    mock.onGet('/client-queue/prof-1/queue').reply(200, {
      professionalId: 'prof-1',
      professionalName: 'Carlos',
      establishmentId: 'est-1',
      establishmentName: 'Barbearia',
      size: 3,
      totalEstimatedMinutes: 90,
      totalElapsedMinutes: 15,
      totalRemainingMinutes: 75,
    });

    const response = await queueService.getQueue('prof-1', 'est-1', 'token');
    expect(response.data.size).toBe(3);
    expect(response.data.totalRemainingMinutes).toBe(75);
  });

  it('getWaitTime deve retornar tempo de espera do cliente', async () => {
    mock.onGet('/client-queue/att-1/wait-time').reply(200, {
      attendanceId: 'att-1',
      clientId: 'cli-1',
      position: 2,
      totalQueueSize: 5,
      totalEstimatedMinutes: 150,
      totalRemainingMinutes: 60,
      estimatedWaitingTime: 40,
      startTime: '2026-06-02T14:00:00Z',
    });

    const response = await queueService.getWaitTime('att-1', 'cli-1', 'token');
    expect(response.data.estimatedWaitingTime).toBe(40);
    expect(response.data.position).toBe(2);
  });

  it('getQueue deve enviar establishmentId como query param', async () => {
    mock.onGet('/client-queue/prof-1/queue').reply((config) => {
      expect(config.params?.establishmentId).toBe('est-1');
      return [200, { size: 0 }];
    });

    await queueService.getQueue('prof-1', 'est-1', 'token');
  });

  it('getWaitTime deve enviar clientId como query param', async () => {
    mock.onGet('/client-queue/att-1/wait-time').reply((config) => {
      expect(config.params?.clientId).toBe('cli-1');
      return [200, { estimatedWaitingTime: 0 }];
    });

    await queueService.getWaitTime('att-1', 'cli-1', 'token');
  });

  it('getQueue deve enviar Authorization header', async () => {
    mock.onGet('/client-queue/prof-1/queue').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer token-123');
      return [200, { size: 0 }];
    });

    await queueService.getQueue('prof-1', 'est-1', 'token-123');
  });
});
