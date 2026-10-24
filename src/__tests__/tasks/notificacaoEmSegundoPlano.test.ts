// push-resolve-sem-abrir-o-app (24/10): a tarefa em segundo plano responde ao botão do push.
const mockDefine = jest.fn();
const mockRegistrar = jest.fn();
const mockResponder = jest.fn();
jest.mock('expo-task-manager', () => ({ defineTask: (...a: unknown[]) => mockDefine(...a) }));
jest.mock('expo-notifications', () => ({ registerTaskAsync: (...a: unknown[]) => mockRegistrar(...a) }));
jest.mock('@utils/trocaPeloPush', () => ({ responderPeloPush: (...a: unknown[]) => mockResponder(...a) }));

// O import precisa vir depois dos `const` dos mocks (o import estático sobe acima deles): o módulo
// define e registra a tarefa ao carregar.
let tratarPayloadDaTarefa: (payload: unknown) => Promise<void>;
beforeAll(() => {
  mockRegistrar.mockResolvedValue(null);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ({ tratarPayloadDaTarefa } = require('../../tasks/notificacaoEmSegundoPlano'));
});

describe('tarefa de notificação em segundo plano', () => {
  it('define e registra a tarefa ao importar', async () => {
    expect(mockDefine).toHaveBeenCalledWith('VUPTH-NOTIFICACAO-EM-SEGUNDO-PLANO', expect.any(Function));
    expect(mockRegistrar).toHaveBeenCalledWith('VUPTH-NOTIFICACAO-EM-SEGUNDO-PLANO');
  });

  it('a resposta a um botão chama o responder em segundo plano, com o id e o data do push', async () => {
    const data = { type: 'SWAP_REQUESTED', swapRequestId: 'r1' };
    await tratarPayloadDaTarefa({ actionIdentifier: 'TROCAR', notification: { request: { identifier: 'n1', content: { data } } } });
    expect(mockResponder).toHaveBeenCalledWith('n1', 'TROCAR', data, true);
  });

  it('notificação recebida (sem botão) ou payload estranho não faz nada', async () => {
    mockResponder.mockClear();
    await tratarPayloadDaTarefa({ notification: null, data: { dataString: '{}' } });
    await tratarPayloadDaTarefa(null);
    expect(mockResponder).not.toHaveBeenCalled();
  });

  it('o executor da tarefa ignora o erro e trata o payload', async () => {
    const executor = mockDefine.mock.calls[0][1] as (a: { data: unknown; error: unknown }) => Promise<void>;
    mockResponder.mockClear();
    await executor({ data: null, error: new Error('x') });
    await executor({ data: { actionIdentifier: 'RECUSAR', notification: { request: { identifier: 'n2', content: { data: {} } } } }, error: null });
    expect(mockResponder).toHaveBeenCalledTimes(1);
    expect(mockResponder).toHaveBeenCalledWith('n2', 'RECUSAR', {}, true);
  });
});
