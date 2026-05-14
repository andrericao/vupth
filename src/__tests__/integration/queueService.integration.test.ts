import { mock } from './setup';
import { queueService } from '../../services/queueService';

describe('QueueService', () => {
  it('getPosition deve retornar posição e tempo estimado', async () => {
    mock.onGet('/client-queue/prof-1/queue').reply(200, {
      position: 3,
      estimatedWaitMinutes: 45,
    });

    const response = await queueService.getPosition('prof-1');

    expect(response.data.position).toBe(3);
    expect(response.data.estimatedWaitMinutes).toBe(45);
  });
});
