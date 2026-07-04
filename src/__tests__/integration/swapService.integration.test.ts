import { mock } from './setup';
import { swapService } from '../../services/swapService';

describe('SwapService (#42)', () => {
  it('propose deve enviar POST com proposer/target e Bearer token', async () => {
    mock.onPost('/swap-requests').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      expect(JSON.parse(config.data)).toEqual({
        proposerAttendanceId: 'att-A',
        targetAttendanceId: 'att-B',
      });
      return [201, { id: 'sw-1', status: 'PENDING', proposerAttendanceId: 'att-A', targetAttendanceId: 'att-B' }];
    });

    const res = await swapService.propose('att-A', 'att-B', 'my-token');
    expect(res.status).toBe(201);
    expect(res.data.status).toBe('PENDING');
  });

  it('propose deve propagar 409 (já pendente)', async () => {
    mock.onPost('/swap-requests').reply(409, { code: 'QUEUE_SWAP_ALREADY_PENDING' });
    await expect(swapService.propose('att-A', 'att-B', 'my-token')).rejects.toMatchObject({
      response: { status: 409 },
    });
  });

  it('respond deve enviar PATCH com accept no query', async () => {
    mock.onPatch('/swap-requests/sw-1').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      expect(config.params).toEqual({ accept: true });
      return [200, { id: 'sw-1', status: 'ACCEPTED' }];
    });

    const res = await swapService.respond('sw-1', true, 'my-token');
    expect(res.data.status).toBe('ACCEPTED');
  });

  it('listMine deve buscar GET /swap-requests/me', async () => {
    mock.onGet('/swap-requests/me').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      return [200, [{ id: 'sw-1', status: 'PENDING' }]];
    });

    const res = await swapService.listMine('my-token');
    expect(res.data).toHaveLength(1);
  });
});
