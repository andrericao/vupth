import { assinar, estadoDaConexao } from '@services/stompCompartilhado';

// C17 (reportado pelo Partner): o Client abria DUAS conexões STOMP — uma do
// tópico da loja e outra do canal pessoal. Agora é uma só, com as assinaturas
// registradas nela.

const mockClientes: MockClient[] = [];

type MockClient = {
  connected: boolean;
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
