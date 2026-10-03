import * as SecureStore from 'expo-secure-store';

import { assinar, estadoDaConexao } from '@services/stompCompartilhado';

// C17 (reportado pelo Partner): o Client abria DUAS conexões STOMP — uma do
// tópico da loja e outra do canal pessoal. Agora é uma só, com as assinaturas
// registradas nela.

const mockClientes: MockClient[] = [];

type MockClient = {
  connected: boolean;
  connectHeaders?: Record<string, string>;
  config: Record<string, any>;
  subscribe: jest.Mock;
  activate: jest.Mock;
  deactivate: jest.Mock;
};

jest.mock('@stomp/stompjs', () => ({
  Client: jest.fn().mockImplementation((config) => {
    const c: MockClient = {
      connected: false,
      config,
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
      activate: jest.fn(),
      deactivate: jest.fn(() => Promise.resolve()),
    };
    mockClientes.push(c);
    return c;
  }),
}));
jest.mock('expo-secure-store');
jest.mock('@services/api', () => ({ WS_URL: 'ws://teste' }));
const mockRenovar = jest.fn();
jest.mock('@stores/authStore', () => ({
  useAuthStore: { getState: () => ({ refreshTokens: mockRenovar }) },
}));

function conectou(c: MockClient) {
  c.connected = true;
  c.config.onConnect({ headers: {} });
}

describe('a conexão STOMP única (C17)', () => {
  beforeEach(() => {
    mockClientes.length = 0;
  });

  it('tópico da loja e canal pessoal usam UMA conexão', () => {
    const sairLoja = assinar('/topic/establishment/e1/queue', 'public', jest.fn());
    const sairPessoal = assinar('/user/queue/notifications', 'personal', jest.fn());
    expect(mockClientes).toHaveLength(1);
    expect(estadoDaConexao()).toEqual({ conexoes: 1, assinaturas: 2 });

    // Ao conectar, as duas assinaturas vão para o servidor.
    conectou(mockClientes[0]);
    expect(mockClientes[0].subscribe).toHaveBeenCalledTimes(2);

    sairLoja();
    sairPessoal();
  });

  it('assinatura nova com a conexão já aberta entra na hora, sem reconectar', () => {
    const sairA = assinar('/topic/a', 'public', jest.fn());
    conectou(mockClientes[0]);
    const sairB = assinar('/topic/b', 'personal', jest.fn());
    expect(mockClientes).toHaveLength(1);
    expect(mockClientes[0].subscribe).toHaveBeenCalledWith('/topic/b', expect.any(Function));
    sairA();
    sairB();
  });

  it('a conexão fecha com a última assinatura — e não antes', () => {
    const sairA = assinar('/topic/a', 'public', jest.fn());
    const sairB = assinar('/topic/b', 'personal', jest.fn());
    const c = mockClientes[0];
    sairA();
    expect(c.deactivate).not.toHaveBeenCalled();
    sairB();
    expect(c.deactivate).toHaveBeenCalled();
    expect(estadoDaConexao()).toEqual({ conexoes: 0, assinaturas: 0 });
  });

  it('a mensagem chega a quem assinou aquele destino', () => {
    const aoReceber = jest.fn();
    const sair = assinar('/topic/x', 'public', aoReceber);
    conectou(mockClientes[0]);
    const [, entregar] = mockClientes[0].subscribe.mock.calls[0];
    entregar({ body: '{}' });
    expect(aoReceber).toHaveBeenCalledWith({ body: '{}' });
    sair();
  });
});

// C16 (renovar-token-no-ws, 03/10): renovar antes de conectar com token
// vencido, e depois de um ERROR INVALID_TOKEN.
describe('o token do CONNECT', () => {
  const b64url = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwt = (exp: number) => `${b64url({ alg: 'HS256' })}.${b64url({ exp })}.x`;
  const vencido = jwt(Math.floor(Date.now() / 1000) - 60);
  const novo = jwt(Math.floor(Date.now() / 1000) + 3600);
  const ler = SecureStore.getItemAsync as jest.Mock;

  beforeEach(() => {
    mockClientes.length = 0;
    mockRenovar.mockReset();
    ler.mockReset();
  });

  it('vencido: renova e conecta com o token novo', async () => {
    ler.mockResolvedValueOnce(vencido).mockResolvedValueOnce(novo);
    const sair = assinar('/user/queue/notifications', 'personal', jest.fn());
    const c = mockClientes[0];
    await c.config.beforeConnect();
    expect(mockRenovar).toHaveBeenCalledTimes(1);
    expect(c.connectHeaders).toEqual({ Authorization: `Bearer ${novo}` });
    sair();
  });

  it('válido: não renova', async () => {
    ler.mockResolvedValue(novo);
    const sair = assinar('/topic/a', 'public', jest.fn());
    const c = mockClientes[0];
    await c.config.beforeConnect();
    expect(mockRenovar).not.toHaveBeenCalled();
    expect(c.connectHeaders).toEqual({ Authorization: `Bearer ${novo}` });
    sair();
  });

  it('visitante: conecta anônimo, sem renovar', async () => {
    ler.mockResolvedValue(null);
    const sair = assinar('/topic/a', 'public', jest.fn());
    const c = mockClientes[0];
    await c.config.beforeConnect();
    expect(mockRenovar).not.toHaveBeenCalled();
    expect(c.connectHeaders).toEqual({});
    sair();
  });

  it('ERROR INVALID_TOKEN: a próxima tentativa renova mesmo com o exp em dia', async () => {
    ler.mockResolvedValue(novo);
    const sair = assinar('/topic/a', 'public', jest.fn());
    const c = mockClientes[0];
    c.config.onStompError({ headers: { message: 'INVALID_TOKEN' } });
    await c.config.beforeConnect();
    expect(mockRenovar).toHaveBeenCalledTimes(1);
    await c.config.beforeConnect();
    expect(mockRenovar).toHaveBeenCalledTimes(1);
    sair();
  });

  it('o refresh falhando não impede a conexão', async () => {
    ler.mockResolvedValue(vencido);
    mockRenovar.mockRejectedValue(new Error('offline'));
    const sair = assinar('/topic/a', 'public', jest.fn());
    const c = mockClientes[0];
    await c.config.beforeConnect();
    expect(c.connectHeaders).toEqual({ Authorization: `Bearer ${vencido}` });
    sair();
  });
});
