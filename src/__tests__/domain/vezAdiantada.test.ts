import { Alert } from 'react-native';

import { oferecerVezAdiantada } from '@utils/vezAdiantada';
import { handleQueueNotification } from '@domain/queue/notifications';
import { attendanceService } from '@services/attendanceService';
import { useAuthStore } from '@stores/authStore';

// Adiantado por desistência (Backend d959214): a vez adiantou, o cliente topa ou não.

jest.mock('expo-secure-store');
jest.mock('@services/attendanceService', () => ({ attendanceService: { acceptEarlierTurn: jest.fn() } }));

type Botao = { text: string; onPress?: () => Promise<void> | void };
const MSG = 'Um cliente desistiu — sua vez adiantou para as 14:30. Topa chegar nesse horário?';

describe('a vez adiantou', () => {
  let alerta: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useAuthStore.setState({ accessToken: 'tk' });
  });
  afterEach(() => alerta.mockRestore());

  it('pergunta com "Topo" e "Não"; "Topo" aceita no servidor e confirma', async () => {
    oferecerVezAdiantada('a1', MSG, 1_000_000);
    const [titulo, mensagem, botoes] = alerta.mock.calls[0] as [string, string, Botao[]];
    expect(titulo).toBe('Sua vez adiantou');
    expect(mensagem).toBe(MSG);
    expect(botoes.map((b) => b.text)).toEqual(['Não, mantenho meu horário', 'Topo']);
    (attendanceService.acceptEarlierTurn as jest.Mock).mockResolvedValue({ data: {} });
    await botoes[1].onPress!();
    expect(attendanceService.acceptEarlierTurn).toHaveBeenCalledWith('a1', 'tk');
    expect(alerta).toHaveBeenLastCalledWith('Combinado', expect.any(String), undefined, { tipo: 'informacao' });
  });

  it('servidor recusando: avisa que segue o horário de antes', async () => {
    oferecerVezAdiantada('a2', MSG, 2_000_000);
    const [, , botoes] = alerta.mock.calls[0] as [string, string, Botao[]];
    (attendanceService.acceptEarlierTurn as jest.Mock).mockRejectedValue(new Error('409'));
    await botoes[1].onPress!();
    expect(alerta).toHaveBeenLastCalledWith('Não foi possível confirmar', expect.stringMatching(/horário de antes/), undefined, { tipo: 'erro' });
  });

  it('WS e push da mesma oferta: pergunta uma vez só (dentro de 1 min)', () => {
    oferecerVezAdiantada('a3', MSG, 3_000_000);
    oferecerVezAdiantada('a3', MSG, 3_010_000);
    expect(alerta).toHaveBeenCalledTimes(1);
    oferecerVezAdiantada('a3', MSG, 3_070_000);
    expect(alerta).toHaveBeenCalledTimes(2);
  });

  it('sem token, "Topo" não chama o servidor', async () => {
    useAuthStore.setState({ accessToken: null });
    oferecerVezAdiantada('a4', MSG, 4_000_000);
    const [, , botoes] = alerta.mock.calls[0] as [string, string, Botao[]];
    await botoes[1].onPress!();
    expect(attendanceService.acceptEarlierTurn).not.toHaveBeenCalled();
  });
});

describe('a notificação do WebSocket', () => {
  const notif = { type: 'EARLIER_TURN_OFFERED' as const, attendanceId: 'a1', establishmentId: 'e1', message: MSG, timestamp: '' };

  it('com a pergunta disponível, pergunta; sem ela, só avisa', () => {
    const oferecer = jest.fn();
    const alert = jest.fn();
    handleQueueNotification(notif, { updateQueue: jest.fn(), leaveQueue: jest.fn(), alert, oferecerVezAdiantada: oferecer });
    expect(oferecer).toHaveBeenCalledWith('a1', MSG);
    expect(alert).not.toHaveBeenCalled();
    handleQueueNotification(notif, { updateQueue: jest.fn(), leaveQueue: jest.fn(), alert });
    expect(alert).toHaveBeenCalledWith('Sua vez adiantou', MSG);
  });
});
