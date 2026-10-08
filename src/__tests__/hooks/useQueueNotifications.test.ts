import { renderHook } from '@testing-library/react-native';

import { useQueueNotifications } from '@hooks/useQueueNotifications';
import { useQueueStore } from '@stores/queueStore';

// cobertura-98 (08/10): as duas assinaturas STOMP — a pessoal e a fila da loja.

type Handler = (m: { body: string }) => void;
const mockAssinaturas: Record<string, Handler> = {};
const mockSair = jest.fn();
const mockHandle = jest.fn();

jest.mock('expo-secure-store');
jest.mock('@services/stompCompartilhado', () => ({
  assinar: (destino: string, _papel: string, fn: Handler) => {
    mockAssinaturas[destino] = fn;
    return mockSair;
  },
}));
jest.mock('@domain/queue/notifications', () => ({
  handleQueueNotification: (...a: unknown[]) => mockHandle(...a),
}));

const updateQueue = jest.fn();
const reanchorQueue = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockAssinaturas)) delete mockAssinaturas[k];
  useQueueStore.setState({
    activeQueue: { attendanceId: 'a1', establishmentId: 'e1', status: 'SCHEDULED' },
    updateQueue,
    reanchorQueue,
  } as never);
});

const FILA = '/topic/establishment/e1/queue';

function broadcast(status: string) {
  return {
    body: JSON.stringify({
      professionals: [
        {
          current_attendance: null,
          waiting_list: [
            { id: 'x', status: 'SCHEDULED', estimated_duration_minutes: 20 },
            { id: 'a1', status },
          ],
        },
      ],
    }),
  };
}

describe('useQueueNotifications', () => {
  it('desligado, não assina nada', () => {
    renderHook(() => useQueueNotifications(false));
    expect(Object.keys(mockAssinaturas)).toHaveLength(0);
  });

  it('a notificação pessoal vai para o tratador, com o atendimento ativo', () => {
    renderHook(() => useQueueNotifications(true));
    mockAssinaturas['/user/queue/notifications']({ body: JSON.stringify({ type: 'ATTENDANCE_STARTED' }) });
    expect(mockHandle).toHaveBeenCalledWith(
      { type: 'ATTENDANCE_STARTED' },
      expect.objectContaining({ activeAttendanceId: 'a1' }),
    );
  });

  it('mensagem pessoal quebrada não derruba', () => {
    renderHook(() => useQueueNotifications(true));
    expect(() => mockAssinaturas['/user/queue/notifications']({ body: '{' })).not.toThrow();
  });

  it('a fila da loja re-ancora a espera e troca o status quando mudou', () => {
    renderHook(() => useQueueNotifications(true));
    mockAssinaturas[FILA](broadcast('LATE'));
    expect(updateQueue).toHaveBeenCalledWith({ status: 'LATE' });
    expect(reanchorQueue).toHaveBeenCalled();
  });

  it('mesmo status: só re-ancora', () => {
    renderHook(() => useQueueNotifications(true));
    mockAssinaturas[FILA](broadcast('SCHEDULED'));
    expect(updateQueue).not.toHaveBeenCalled();
    expect(reanchorQueue).toHaveBeenCalled();
  });

  it('fora da lista: nada', () => {
    renderHook(() => useQueueNotifications(true));
    mockAssinaturas[FILA]({ body: JSON.stringify({ professionals: [] }) });
    expect(reanchorQueue).not.toHaveBeenCalled();
  });

  it('fila quebrada não derruba', () => {
    renderHook(() => useQueueNotifications(true));
    expect(() => mockAssinaturas[FILA]({ body: 'x' })).not.toThrow();
  });

  it('sem loja, assina só a pessoal; desmontar sai', () => {
    useQueueStore.setState({ activeQueue: null } as never);
    const { unmount } = renderHook(() => useQueueNotifications(true));
    expect(Object.keys(mockAssinaturas)).toEqual(['/user/queue/notifications']);
    unmount();
    expect(mockSair).toHaveBeenCalledTimes(1);
  });
});
