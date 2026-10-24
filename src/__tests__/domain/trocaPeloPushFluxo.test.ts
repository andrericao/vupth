import { Alert } from 'react-native';

import { confirmarTrocaPeloPush, recusarTrocaPeloPush, responderPeloPush } from '@utils/trocaPeloPush';
import { useAuthStore } from '@stores/authStore';

// troca-pela-notificacao (15/10): o aceite pelo CONFIRMAR e o reenvio com a
// confirmação de menos de 1 hora.

const mockAcceptRequest = jest.fn();
const mockAcceptOffer = jest.fn();
const mockAcceptEarlier = jest.fn();
const mockRefuse = jest.fn();
const mockAgendar = jest.fn();
jest.mock('expo-notifications', () => ({ scheduleNotificationAsync: (...a: unknown[]) => mockAgendar(...a) }));
jest.mock('@services/swapOfferService', () => ({
  swapOfferService: {
    acceptRequest: (...a: unknown[]) => mockAcceptRequest(...a),
    accept: (...a: unknown[]) => mockAcceptOffer(...a),
    refuseRequest: (...a: unknown[]) => mockRefuse(...a),
  },
}));
jest.mock('@services/attendanceService', () => ({
  attendanceService: { acceptEarlierTurn: (...a: unknown[]) => mockAcceptEarlier(...a) },
}));

type Botao = { text: string; onPress?: () => Promise<void> };
const precisa = { response: { status: 409, data: { code: 'SWAP_NEEDS_CONFIRMATION' } } };
let alerta: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useAuthStore.setState({ accessToken: 'tk' } as never);
  mockAcceptRequest.mockResolvedValue({});
  mockAcceptOffer.mockResolvedValue({});
  mockAcceptEarlier.mockResolvedValue({});
  mockRefuse.mockResolvedValue({});
});

afterEach(() => alerta.mockRestore());

describe('CONFIRMAR da troca', () => {
  it('aceita o pedido, a oferta e a vez adiantada', async () => {
    await confirmarTrocaPeloPush({ type: 'SWAP_REQUESTED', swapRequestId: 'r1' });
    expect(mockAcceptRequest).toHaveBeenCalledWith('r1', 'tk', false);
    await confirmarTrocaPeloPush({ type: 'SWAP_OFFERED', offerId: 'o1' });
    expect(mockAcceptOffer).toHaveBeenCalledWith('o1', 'tk', false);
    await confirmarTrocaPeloPush({ type: 'EARLIER_TURN_OFFERED', attendanceId: 'a1' });
    expect(mockAcceptEarlier).toHaveBeenCalledWith('a1', 'tk');
    expect(alerta).toHaveBeenCalledWith('Troca confirmada', expect.any(String));
  });

  it('sem login ou sem o que aceitar, não chama nada', async () => {
    await confirmarTrocaPeloPush({ type: 'ATTENDANCE_STARTED' });
    useAuthStore.setState({ accessToken: null } as never);
    await confirmarTrocaPeloPush({ type: 'SWAP_OFFERED', offerId: 'o1' });
    expect(mockAcceptOffer).not.toHaveBeenCalled();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('outro erro: avisa que não deu', async () => {
    mockAcceptOffer.mockRejectedValue({ response: { status: 422 } });
    await confirmarTrocaPeloPush({ type: 'SWAP_OFFERED', offerId: 'o1' });
    expect(alerta).toHaveBeenCalledWith('Não foi possível trocar', expect.any(String));
  });

  it('menos de 1 hora: o aviso, e o CONFIRMAR manda de novo com a confirmação', async () => {
    mockAcceptRequest.mockRejectedValueOnce(precisa);
    await confirmarTrocaPeloPush({ type: 'SWAP_REQUESTED', swapRequestId: 'r1', newWaitMinutes: 25 });
    const [titulo, mensagem, botoes] = alerta.mock.calls[0] as [string, string, Botao[]];
    expect(titulo).toBe('Menos de 1 hora');
    expect(mensagem).toMatch(/25 min/);
    expect(botoes.map((b) => b.text)).toEqual(['AGORA NÃO', 'CONFIRMAR']);
    await botoes[1].onPress!();
    expect(mockAcceptRequest).toHaveBeenLastCalledWith('r1', 'tk', true);
    expect(alerta).toHaveBeenLastCalledWith('Troca confirmada', expect.any(String));
  });

  it('menos de 1 hora e o reenvio falha: avisa que não deu', async () => {
    mockAcceptOffer.mockRejectedValueOnce(precisa).mockRejectedValueOnce(new Error('x'));
    await confirmarTrocaPeloPush({ type: 'SWAP_OFFERED', offerId: 'o1' });
    const botoes = alerta.mock.calls[0][2] as Botao[];
    await botoes[1].onPress!();
    expect(alerta).toHaveBeenLastCalledWith('Não foi possível trocar', expect.any(String));
  });
});

// push-acoes-por-pergunta (24/10): o Recusar do pedido de troca.
describe('RECUSAR da troca', () => {
  it('nega o pedido pelo swapRequestId, sem aviso quando dá certo', async () => {
    await recusarTrocaPeloPush({ type: 'SWAP_REQUESTED', swapRequestId: 'r1' });
    expect(mockRefuse).toHaveBeenCalledWith('r1', 'tk');
    expect(alerta).not.toHaveBeenCalled();
  });

  it('sem login ou sem pedido, não chama nada; se falhar, avisa', async () => {
    await recusarTrocaPeloPush({ type: 'SWAP_OFFERED', offerId: 'o1' });
    useAuthStore.setState({ accessToken: null } as never);
    await recusarTrocaPeloPush({ type: 'SWAP_REQUESTED', swapRequestId: 'r1' });
    expect(mockRefuse).not.toHaveBeenCalled();
    useAuthStore.setState({ accessToken: 'tk' } as never);
    mockRefuse.mockRejectedValue({ response: { status: 422 } });
    await recusarTrocaPeloPush({ type: 'SWAP_REQUESTED', swapRequestId: 'r1' });
    expect(alerta).toHaveBeenCalledWith('Não foi possível recusar', expect.any(String));
  });
});

// push-resolve-sem-abrir-o-app (24/10): a mesma resposta, com o app fechado (tarefa em segundo plano).
describe('em segundo plano', () => {
  const pedido = { type: 'SWAP_REQUESTED', swapRequestId: 'r1' };

  it('responde pela API sem Alert; a falha vira notificação local', async () => {
    await confirmarTrocaPeloPush(pedido, true);
    expect(mockAcceptRequest).toHaveBeenCalledWith('r1', 'tk', false);
    expect(alerta).not.toHaveBeenCalled();
    mockAcceptRequest.mockRejectedValueOnce({ response: { status: 422 } });
    await confirmarTrocaPeloPush(pedido, true);
    expect(mockAgendar).toHaveBeenCalledWith({ content: { title: 'Não foi possível trocar', body: expect.any(String) }, trigger: null });
    expect(alerta).not.toHaveBeenCalled();
  });

  it('menos de 1 hora: sem pergunta na tela, a notificação manda abrir o app', async () => {
    mockAcceptRequest.mockRejectedValueOnce(precisa);
    await confirmarTrocaPeloPush({ ...pedido, newWaitMinutes: 25 }, true);
    expect(alerta).not.toHaveBeenCalled();
    const { content } = mockAgendar.mock.calls[0][0] as { content: { title: string; body: string } };
    expect(content.title).toBe('Menos de 1 hora');
    expect(content.body).toMatch(/Abra o app para confirmar/);
  });

  it('Recusar que falha também vira notificação local', async () => {
    mockRefuse.mockRejectedValueOnce({ response: { status: 422 } });
    await recusarTrocaPeloPush(pedido, true);
    expect(mockAgendar).toHaveBeenCalledWith({ content: { title: 'Não foi possível recusar', body: expect.any(String) }, trigger: null });
  });

  it('sem o módulo de push, a falha não quebra', async () => {
    mockAgendar.mockRejectedValueOnce(new Error('sem módulo'));
    mockAcceptRequest.mockRejectedValueOnce({ response: { status: 422 } });
    await expect(confirmarTrocaPeloPush(pedido, true)).resolves.toBeUndefined();
  });
});

describe('responderPeloPush', () => {
  const pedido = { type: 'SWAP_REQUESTED', swapRequestId: 'r1' };

  it('Trocar e Aceitar aceitam; Recusar recusa; outro botão não é resposta', async () => {
    expect(await responderPeloPush('n1', 'TROCAR', pedido)).toBe(true);
    expect(mockAcceptRequest).toHaveBeenCalledWith('r1', 'tk', false);
    expect(await responderPeloPush('n2', 'ACEITAR', { type: 'EARLIER_TURN_OFFERED', attendanceId: 'a1' })).toBe(true);
    expect(mockAcceptEarlier).toHaveBeenCalledWith('a1', 'tk');
    expect(await responderPeloPush('n3', 'RECUSAR', pedido)).toBe(true);
    expect(mockRefuse).toHaveBeenCalledWith('r1', 'tk');
    expect(await responderPeloPush('n4', 'MANTER', pedido)).toBe(false);
  });

  it('a mesma notificação responde uma vez só (a tarefa e o ouvinte chegam juntos)', async () => {
    await responderPeloPush('n5', 'TROCAR', pedido, true);
    await responderPeloPush('n5', 'TROCAR', pedido);
    expect(mockAcceptRequest).toHaveBeenCalledTimes(1);
  });

  it('em segundo plano o JS sobe sem sessão: restaura antes de chamar a API', async () => {
    const restore = jest.fn().mockImplementation(async () => {
      useAuthStore.setState({ accessToken: 'tk2' } as never);
    });
    useAuthStore.setState({ accessToken: null, restoreSession: restore } as never);
    await responderPeloPush('n6', 'TROCAR', pedido, true);
    expect(restore).toHaveBeenCalled();
    expect(mockAcceptRequest).toHaveBeenCalledWith('r1', 'tk2', false);
  });
});
