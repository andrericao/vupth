import { mock } from './setup';
import { pushService } from '../../services/pushService';

describe('PushService', () => {
  it('registerDevice envia POST /devices { token, platform } + Bearer', async () => {
    mock.onPost('/devices').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      expect(JSON.parse(config.data)).toEqual({
        token: 'ExponentPushToken[abc]',
        platform: 'android',
      });
      return [200, { id: 'dev-1', token: 'ExponentPushToken[abc]', platform: 'android' }];
    });

    const res = await pushService.registerDevice('ExponentPushToken[abc]', 'android', 'my-token');
    expect(res.status).toBe(200);
  });

  it('unregisterDevice faz DELETE com o token url-encodado', async () => {
    mock.onDelete('/devices/ExponentPushToken%5Babc%5D').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      return [204];
    });

    const res = await pushService.unregisterDevice('ExponentPushToken[abc]', 'my-token');
    expect(res.status).toBe(204);
  });
});
