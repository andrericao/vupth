import {
  mapPlatform,
  deviceDeletePath,
  notificationRoute,
  acquireExpoPushToken,
  PushEnv,
} from '../../domain/push';

describe('mapPlatform', () => {
  it('mantém ios/android/web e cai em android no desconhecido', () => {
    expect(mapPlatform('ios')).toBe('ios');
    expect(mapPlatform('android')).toBe('android');
    expect(mapPlatform('web')).toBe('web');
    expect(mapPlatform('windows')).toBe('android');
  });
});

describe('deviceDeletePath', () => {
  it('url-encoda os colchetes do token Expo (Tomcat rejeita [ ] crus)', () => {
    expect(deviceDeletePath('ExponentPushToken[abc123]')).toBe(
      '/devices/ExponentPushToken%5Babc123%5D',
    );
  });
});

describe('notificationRoute', () => {
  it('tipos conhecidos → aba attendances', () => {
    for (const type of [
      'ATTENDANCE_STARTED',
      'ATTENDANCE_FINISHED',
      'ATTENDANCE_PROMOTED',
      'ATTENDANCE_CANCELLED',
      'CUT_ACCEPTED',
      'CUT_REFUSED',
      'CUT_EXPIRED',
      'QUEUE_NEXT_IN_LINE',
    ]) {
      expect(notificationRoute({ type })).toBe('attendances');
    }
  });

  it('tipo desconhecido/ausente/inválido → null', () => {
    expect(notificationRoute({ type: 'FOO' })).toBeNull();
    expect(notificationRoute({})).toBeNull();
    expect(notificationRoute(null)).toBeNull();
    expect(notificationRoute({ type: 123 })).toBeNull();
  });
});

describe('acquireExpoPushToken', () => {
  const baseEnv = (over: Partial<PushEnv>): PushEnv => ({
    isDevice: true,
    getPermissionsAsync: async () => ({ status: 'granted' }),
    requestPermissionsAsync: async () => ({ status: 'granted' }),
    getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[tok]' }),
    projectId: 'proj-1',
    ...over,
  });

  it('device + permissão já concedida → token', async () => {
    expect(await acquireExpoPushToken(baseEnv({}))).toBe('ExponentPushToken[tok]');
  });

  it('não é device físico → null (nem pede permissão)', async () => {
    const request = jest.fn();
    const token = await acquireExpoPushToken(
      baseEnv({ isDevice: false, requestPermissionsAsync: request as never }),
    );
    expect(token).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('permissão negada no pedido → null', async () => {
    const token = await acquireExpoPushToken(
      baseEnv({
        getPermissionsAsync: async () => ({ status: 'undetermined' }),
        requestPermissionsAsync: async () => ({ status: 'denied' }),
      }),
    );
    expect(token).toBeNull();
  });

  it('pede permissão só quando ainda não concedida', async () => {
    const request = jest.fn(async () => ({ status: 'granted' }));
    await acquireExpoPushToken(
      baseEnv({
        getPermissionsAsync: async () => ({ status: 'undetermined' }),
        requestPermissionsAsync: request,
      }),
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
});
