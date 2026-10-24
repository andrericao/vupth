import {
  atendimentoParaAvaliar,
  pagamentoDoPush,
  avisoDoPush,
  tocouNoOk,
  ACAO_OK,
  CANAL_ALERTAS,
  CATEGORIA_CIENCIA,
  CATEGORIAS_COM_BOTAO,
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
    ]) {
      expect(notificationRoute({ type })).toBe('attendances');
    }
  });

  it('a falta vale como atraso (DEC-86): LATE_MARKED leva à fila; NO_SHOW_REMOVED saiu', () => {
    expect(notificationRoute({ type: 'LATE_MARKED' })).toBe('fila');
    expect(notificationRoute({ type: 'NO_SHOW_REMOVED' })).toBeNull();
  });

  it('"É quase a sua vez!" (QUEUE_NEXT_IN_LINE) → a própria fila (Andre, 05/10)', () => {
    expect(notificationRoute({ type: 'QUEUE_NEXT_IN_LINE' })).toBe('fila');
  });

  it('tipo desconhecido/ausente/inválido → null', () => {
    expect(notificationRoute({ type: 'FOO' })).toBeNull();
    for (const type of ['SWAP_REQUESTED', 'SWAP_OFFERED', 'EARLIER_TURN_OFFERED', 'SWAP_ACCEPTED', 'SWAP_OFFER_ACCEPTED']) {
      expect(notificationRoute({ type })).toBe('fila');
    }
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

  it('já respondida (negada) → não pede de novo a cada abertura', async () => {
    const request = jest.fn(async () => ({ status: 'granted' }));
    const r = await acquireExpoPushToken(
      baseEnv({
        getPermissionsAsync: async () => ({ status: 'denied', canAskAgain: true }),
        requestPermissionsAsync: request,
        jaPerguntou: async () => true,
      }),
    );
    expect(request).not.toHaveBeenCalled();
    expect(r.motivo).toBe('sem-permissao');
  });

  it('Android 13+: "denied" de quem nunca foi perguntado → pede (bateria 10/10 08:06)', async () => {
    const request = jest.fn(async () => ({ status: 'granted' }));
    const r = await acquireExpoPushToken(
      baseEnv({
        getPermissionsAsync: async () => ({ status: 'denied', canAskAgain: true }),
        requestPermissionsAsync: request,
        jaPerguntou: async () => false,
      }),
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(r.motivo).toBe('ok');
  });

  it('o sistema não deixa perguntar de novo → não pede', async () => {
    const request = jest.fn(async () => ({ status: 'granted' }));
    await acquireExpoPushToken(
      baseEnv({
        getPermissionsAsync: async () => ({ status: 'undetermined', canAskAgain: false }),
        requestPermissionsAsync: request,
      }),
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('a caixa já apareceu neste aparelho → não pede; a primeira vez marca', async () => {
    const request = jest.fn(async () => ({ status: 'denied' }));
    const marcar = jest.fn(async () => {});
    const undetermined = async () => ({ status: 'undetermined' });

    await acquireExpoPushToken(
      baseEnv({ getPermissionsAsync: undetermined, requestPermissionsAsync: request,
        jaPerguntou: async () => false, marcarPerguntado: marcar }),
    );
    expect(marcar).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);

    await acquireExpoPushToken(
      baseEnv({ getPermissionsAsync: undetermined, requestPermissionsAsync: request,
        jaPerguntou: async () => true, marcarPerguntado: marcar }),
    );
    expect(request).toHaveBeenCalledTimes(1);
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


// Andre, 26/09: com o app aberto, o aviso de que o corte está próximo tem "OK".
describe('o push com o app aberto', () => {
  it('vira aviso com o título e o texto do push', () => {
    expect(avisoDoPush({ title: 'Sua vez está chegando', body: 'Faltam 10 min' })).toEqual({
      titulo: 'Sua vez está chegando',
      mensagem: 'Faltam 10 min',
    });
  });

  it('sem título, usa o nome do app; sem texto nenhum, não mostra nada', () => {
    expect(avisoDoPush({ title: null, body: 'Oi' })).toEqual({ titulo: 'VUPTH', mensagem: 'Oi' });
    expect(avisoDoPush({ title: ' ', body: '' })).toBeNull();
    expect(avisoDoPush({})).toBeNull();
  });
});

describe('notificação de ciência (app fechado)', () => {
  it('o botão OK só fecha; o toque no corpo segue navegando', () => {
    expect(tocouNoOk({ actionIdentifier: ACAO_OK })).toBe(true);
    expect(tocouNoOk({ actionIdentifier: 'expo.modules.notifications.actions.DEFAULT' })).toBe(false);
  });

  it('o botão que abre a tela não é o OK: segue navegando', () => {
    expect(tocouNoOk({ actionIdentifier: 'VER_FILA' })).toBe(false);
    expect(CATEGORIAS_COM_BOTAO.map((c) => c.categoria)).toEqual(['VER_FILA', 'VER_ATENDIMENTO', 'AVALIAR', 'PAGAR', 'PAGAR_MULTA']);
  });

  it('ids combinados com o Backend e o Partner', () => {
    expect(CATEGORIA_CIENCIA).toBe('CIENCIA');
    expect(CANAL_ALERTAS).toBe('alertas');
  });
});

describe('atendimentoParaAvaliar (notificacao-avaliar)', () => {
  it('o push de concluído com o atendimento: a avaliação dele', () => {
    expect(atendimentoParaAvaliar({ type: 'ATTENDANCE_FINISHED', attendanceId: 'a1' })).toBe('a1');
  });

  it('outro tipo, sem id ou sem dados: nada', () => {
    expect(atendimentoParaAvaliar({ type: 'ATTENDANCE_STARTED', attendanceId: 'a1' })).toBeNull();
    expect(atendimentoParaAvaliar({ type: 'ATTENDANCE_FINISHED' })).toBeNull();
    expect(atendimentoParaAvaliar({ type: 'ATTENDANCE_FINISHED', attendanceId: '' })).toBeNull();
    expect(atendimentoParaAvaliar(undefined)).toBeNull();
  });
});


// pagamento-ja-paguei e push-acoes-por-pergunta (24/10): o push que abre o pagamento (categoria PAGAR).
describe('pagamentoDoPush', () => {
  it('PAYMENT_REFUSED abre com o aviso; PAYMENT_PENDING abre sem ele', () => {
    expect(pagamentoDoPush({ type: 'PAYMENT_REFUSED', attendanceId: 'a1' })).toEqual({ attendanceId: 'a1', recusado: true });
    expect(pagamentoDoPush({ type: 'PAYMENT_PENDING', attendanceId: 'a1' })).toEqual({ attendanceId: 'a1', recusado: false });
  });

  it('sem attendanceId, ou de outro tipo, não abre nada', () => {
    expect(pagamentoDoPush({ type: 'PAYMENT_REFUSED' })).toBeNull();
    expect(pagamentoDoPush({ type: 'ATTENDANCE_FINISHED', attendanceId: 'a1' })).toBeNull();
    expect(pagamentoDoPush(null)).toBeNull();
  });
});
