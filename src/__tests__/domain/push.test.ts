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

  // Até 07/09 os quatro desfechos abaixo devolviam o MESMO `null`, e o
  // chamador engolia o resto num `catch {}`. O relato "não recebi nenhuma
  // notificação" ficava indistinguível de "nem tentamos" — cada um destes
  // motivos manda investigar num lugar diferente.

  it('device + permissão já concedida → token, motivo ok', async () => {
    const r = await acquireExpoPushToken(baseEnv({}));
    expect(r.token).toBe('ExponentPushToken[tok]');
    expect(r.motivo).toBe('ok');
  });

  it('não é device físico → motivo "emulador" (e nem pede permissão)', async () => {
    const request = jest.fn();
    const r = await acquireExpoPushToken(
      baseEnv({ isDevice: false, requestPermissionsAsync: request as never }),
    );
    expect(r.token).toBeNull();
    expect(r.motivo).toBe('emulador');
    expect(request).not.toHaveBeenCalled();
  });

  it('permissão negada → motivo "sem-permissao"', async () => {
    const r = await acquireExpoPushToken(
      baseEnv({
        getPermissionsAsync: async () => ({ status: 'undetermined' }),
        requestPermissionsAsync: async () => ({ status: 'denied' }),
      }),
    );
    expect(r.token).toBeNull();
    expect(r.motivo).toBe('sem-permissao');
  });

  it('sem projectId → motivo proprio, e NAO chama o Expo', async () => {
    // Sintoma identico ao de permissao negada; sem nomear, procura-se no lugar
    // errado.
    const get = jest.fn(async () => ({ data: 'ExponentPushToken[x]' }));
    const r = await acquireExpoPushToken(
      baseEnv({ projectId: undefined, getExpoPushTokenAsync: get }),
    );
    expect(r.motivo).toBe('sem-project-id');
    expect(get).not.toHaveBeenCalled();
  });

  it('a chamada nativa lancando vira motivo "erro" COM detalhe, sem derrubar', async () => {
    // E aqui que cai a credencial de push nao configurada no projeto.
    const r = await acquireExpoPushToken(
      baseEnv({
        getExpoPushTokenAsync: async () => {
          throw new Error('No FCM credentials');
        },
      }),
    );
    expect(r.motivo).toBe('erro');
    expect(r.detalhe).toContain('FCM');
    expect(r.token).toBeNull();
  });

  it('Expo respondendo sem token → motivo "sem-token"', async () => {
    const r = await acquireExpoPushToken(
      baseEnv({ getExpoPushTokenAsync: async () => ({ data: '' }) }),
    );
    expect(r.motivo).toBe('sem-token');
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
