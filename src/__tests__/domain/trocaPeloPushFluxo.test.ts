import { Alert } from 'react-native';

import { confirmarTrocaPeloPush, recusarTrocaPeloPush } from '@utils/trocaPeloPush';
import { useAuthStore } from '@stores/authStore';

// troca-pela-notificacao (15/10): o aceite pelo CONFIRMAR e o reenvio com a
// confirmação de menos de 1 hora.

const mockAcceptRequest = jest.fn();
const mockAcceptOffer = jest.fn();
const mockAcceptEarlier = jest.fn();
const mockRefuse = jest.fn();
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
