import { AppState } from 'react-native';

import { assinar } from '@services/stompCompartilhado';

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

// cobertura-98 (08/10): a mensagem chegando, o erro do socket, a volta do
// segundo plano e o desassinar repetido.

describe('a conexão STOMP única — bordas', () => {
  let aoMudar: ((s: string) => void) | undefined;
  beforeEach(() => {
    mockClientes.length = 0;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: (s: string) => void) => {
      aoMudar = fn;
      return { remove: jest.fn() };
    }) as never);
    (global as unknown as { WebSocket: unknown }).WebSocket = jest.fn();
  });
  afterEach(() => jest.restoreAllMocks());

  it('a mensagem chega a quem assinou, e o socket é o do WS_URL', () => {
    const aoReceber = jest.fn();
    const sair = assinar('/topic/a', 'public', aoReceber);
    const c = mockClientes[0];
    c.config.webSocketFactory();
    expect((global as unknown as { WebSocket: jest.Mock }).WebSocket).toHaveBeenCalledWith('ws://teste');
    conectou(c);
    const entregar = c.subscribe.mock.calls[0][1];
    entregar({ body: '{}' });
    expect(aoReceber).toHaveBeenCalledWith({ body: '{}' });
    sair();
    sair(); // de novo: nada
  });

  it('erro do socket vai para o painel, com e sem descrição', () => {
    const sair = assinar('/topic/a', 'public', jest.fn());
    const c = mockClientes[0];
    expect(() => c.config.onWebSocketError({ message: 'caiu' })).not.toThrow();
    expect(() => c.config.onWebSocketError(undefined)).not.toThrow();
    sair();
  });

  it('voltando do segundo plano desconectado, reconecta; conectado, não', async () => {
    const sair = assinar('/topic/a', 'public', jest.fn());
    const c = mockClientes[0];
    aoMudar?.('active');
    await Promise.resolve();
    await Promise.resolve();
    expect(c.deactivate).toHaveBeenCalled();
    expect(c.activate).toHaveBeenCalledTimes(2);
    c.connected = true;
    c.deactivate.mockClear();
    aoMudar?.('active');
    expect(c.deactivate).not.toHaveBeenCalled();
    sair();
  });

  it('desassinar com a conexão já caída não quebra', () => {
    const sair = assinar('/topic/a', 'public', jest.fn());
    const c = mockClientes[0];
    c.subscribe.mockReturnValue({ unsubscribe: () => { throw new Error('caiu'); } });
    conectou(c);
    expect(() => sair()).not.toThrow();
  });
});
