import {
  parseConnectHeaders,
  channelVerdict,
  shouldReconnectOnForeground,
  formatSince,
} from '@domain/ws/diagnostics';

// Backend pediu o "Teste 0" (ler os headers do frame CONNECTED) como
// pré-requisito de todos os testes de WebSocket. Estes casos travam a leitura,
// porque é dela que sai a decisão de dois itens em aberto entre os projetos:
// S14 (token inválido conecta ANÔNIMO em vez de ser recusado) e S17 (heartbeat
// 0,0 => socket zumbi).

describe('parseConnectHeaders', () => {
  it('lê heartbeat e Principal de um CONNECTED saudável', () => {
    const info = parseConnectHeaders({
      version: '1.2',
      'heart-beat': '10000,10000',
      'user-name': '8f3c1e2a-0000-4000-8000-000000000001',
    });

    expect(info.serverSendsMs).toBe(10000);
    expect(info.serverExpectsMs).toBe(10000);
    expect(info.authenticated).toBe(true);
  });

  it('trata user-name ausente ou vazio como conexão ANÔNIMA', () => {
    // O caso do S14: o Spring omite (ou manda vazio) quando não há Principal.
    // Aceitar string vazia como "nome" esconderia exatamente o bug procurado.
    expect(parseConnectHeaders({ 'heart-beat': '10000,10000' }).authenticated).toBe(false);
    expect(parseConnectHeaders({ 'user-name': '   ' }).authenticated).toBe(false);
    expect(parseConnectHeaders(null).authenticated).toBe(false);
  });

  it('lê heartbeat 0,0 sem confundir com ausência', () => {
    const info = parseConnectHeaders({ 'heart-beat': '0,0' });

    expect(info.heartBeat).toBe('0,0');
    expect(info.serverSendsMs).toBe(0);
  });
});

describe('channelVerdict', () => {
  const healthy = parseConnectHeaders({
    'heart-beat': '10000,10000',
    'user-name': 'cliente-1',
  });

  it('acusa o canal PESSOAL conectado como anônimo', () => {
    const anon = parseConnectHeaders({ 'heart-beat': '10000,10000' });
    const verdict = channelVerdict('personal', 'connected', anon);

    expect(verdict.level).toBe('bad');
    expect(verdict.message).toMatch(/AN[ÔO]NIMO/i);
  });

  it('não reclama de anonimato no canal PÚBLICO, que não depende de identidade', () => {
    const anon = parseConnectHeaders({ 'heart-beat': '10000,10000' });

    expect(channelVerdict('public', 'connected', anon).level).toBe('ok');
  });

  it('avisa quando o servidor não manda heartbeat', () => {
    const noBeat = parseConnectHeaders({ 'heart-beat': '0,0', 'user-name': 'cliente-1' });
    const verdict = channelVerdict('personal', 'connected', noBeat);

    expect(verdict.level).toBe('warn');
    expect(verdict.message).toMatch(/heartbeat/i);
  });

  it('dá OK quando há identidade e batida', () => {
    expect(channelVerdict('personal', 'connected', healthy).level).toBe('ok');
  });

  it('separa handshake falho de ausência de fila', () => {
    expect(channelVerdict('personal', 'error', null).level).toBe('bad');
    expect(channelVerdict('personal', 'idle', null).level).toBe('idle');
  });
});

describe('shouldReconnectOnForeground (C18)', () => {
  it('reconecta ao voltar para o primeiro plano com o socket caído', () => {
    expect(shouldReconnectOnForeground('active', false)).toBe(true);
  });

  it('não mexe num socket que sobreviveu', () => {
    expect(shouldReconnectOnForeground('active', true)).toBe(false);
  });

  it('ignora background e inactive', () => {
    expect(shouldReconnectOnForeground('background', false)).toBe(false);
    expect(shouldReconnectOnForeground('inactive', false)).toBe(false);
  });
});

describe('formatSince', () => {
  const now = Date.UTC(2026, 7, 6, 12, 0, 0);

  it('descreve a espera em segundos, minutos e horas', () => {
    expect(formatSince(now - 12_000, now)).toBe('há 12s');
    expect(formatSince(now - 180_000, now)).toBe('há 3min');
    expect(formatSince(now - 7_200_000, now)).toBe('há 2h');
  });

  it('diz "nunca" quando nada chegou — o caso que interessa no teste', () => {
    expect(formatSince(null, now)).toBe('nunca');
  });
});
