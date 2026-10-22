import { renderHook, act } from '@testing-library/react-native';

import { useQueueCountdown, URGENCY_COLORS } from '@hooks/useQueueCountdown';
import { useQueueStore } from '@stores/queueStore';
import { useAuthStore } from '@stores/authStore';

// cobertura-98 (08/10): a contagem da fila — urgencia, intervalo do poll, o que
// o servidor manda (previsao, posicao, tolerancia, multa, atrasos) e o status
// real (comecou, saiu sem atendimento).

jest.mock('expo-secure-store');

const mockWait = jest.fn();
const mockHist = jest.fn();
jest.mock('@services/queueService', () => ({ queueService: { getWaitTime: (...a: unknown[]) => mockWait(...a) } }));
jest.mock('@services/attendanceService', () => ({
  attendanceService: { listClientHistory: (...a: unknown[]) => mockHist(...a) },
}));

const update = jest.fn();
const leave = jest.fn();
const AGORA = 1_800_000_000_000;

function fila(over: Record<string, unknown> = {}) {
  return {
    attendanceId: 'a1',
    professionalId: 'p1',
    establishmentId: 'e1',
    enteredAt: AGORA,
    estimatedMinutes: 30,
    status: 'SCHEDULED',
    ...over,
  };
}

function montar(f: Record<string, unknown> | null) {
  useQueueStore.setState({ activeQueue: f, updateQueue: update, leaveQueue: leave } as never);
  return renderHook(() => useQueueCountdown());
}

async function avancar(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(AGORA);
  jest.clearAllMocks();
  useAuthStore.setState({ accessToken: 'tk', user: { id: 'u1' } } as never);
  mockWait.mockResolvedValue({ data: { estimatedWaitingTime: 30, position: 2 } });
  mockHist.mockResolvedValue({ data: [{ id: 'a1', status: 'SCHEDULED', services: [] }] });
});

afterEach(() => jest.useRealTimers());

describe('useQueueCountdown — a contagem', () => {
  it('sem fila: nada, cor normal', () => {
    const { result } = montar(null);
    expect(result.current.isInQueue).toBe(false);
    expect(result.current.color).toBe(URGENCY_COLORS.normal);
  });

  it('com 5 min na espera: urgente', async () => {
    const { result } = montar(fila({ estimatedMinutes: 5 }));
    await avancar(1);
    expect(result.current.urgency).toBe('urgent');
    expect(result.current.color).toBe(URGENCY_COLORS.urgent);
  });

  it('sem previsão: sem urgência, semPrevisao', async () => {
    const { result } = montar(fila({ estimatedMinutes: null }));
    await avancar(1);
    expect(result.current.semPrevisao).toBe(true);
    expect(result.current.urgency).toBe('normal');
  });

  it('em atendimento: o tempo decorrido em segundos', async () => {
    const { result } = montar(fila({ status: 'IN_PROGRESS', startedAt: AGORA - 90_000, estimatedMinutes: 0 }));
    await avancar(1000);
    expect(result.current.isBeingAttended).toBe(true);
    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(90);
    expect(result.current.urgency).toBe('normal');
  });

  it('os estados: atrasado, pausado, concluído', () => {
    expect(montar(fila({ status: 'LATE' })).result.current.isLate).toBe(true);
    expect(montar(fila({ status: 'PAUSED' })).result.current.isPaused).toBe(true);
    expect(montar(fila({ status: 'FINISHED' })).result.current.isFinished).toBe(true);
  });
});

describe('useQueueCountdown — o que o servidor manda', () => {
  it('a primeira consulta grava posição, âncora, tolerância, multa e atrasos', async () => {
    mockWait.mockResolvedValue({
      data: { estimatedWaitingTime: 25, position: 3, toleranceUntil: new Date(AGORA + 60_000).toISOString(), exitPenaltyValue: 5, lateCount: 1, penaltyExempt: true },
    });
    useQueueStore.setState({ activeQueue: fila() } as never);
    montar(fila());
    await avancar(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ position: 3, initialPosition: 3, exitPenaltyValue: 5, lateCount: 1, penaltyExempt: true, toleranceUntil: AGORA + 60_000 }),
    );
  });

  it('sem previsão local, a do servidor entra inteira', async () => {
    mockWait.mockResolvedValue({ data: { estimatedWaitingTime: 12, position: 1 } });
    montar(fila({ estimatedMinutes: null, position: 1, initialPosition: 1 }));
    await avancar(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ estimatedMinutes: 12 }));
  });

  it('nada mudou: não atualiza', async () => {
    mockWait.mockResolvedValue({ data: { estimatedWaitingTime: 30, position: 2 } });
    montar(fila({ position: 2, initialPosition: 2 }));
    await avancar(1);
    expect(update).not.toHaveBeenCalled();
  });

  it('o atendimento começou: guarda o início e a duração', async () => {
    mockWait.mockRejectedValue(new Error('saiu da fila'));
    mockHist.mockResolvedValue({
      data: [{ id: 'a1', status: 'IN_PROGRESS', startTime: new Date(AGORA).toISOString(), services: [{ estimatedMinutes: 20 }, {}] }],
    });
    montar(fila());
    await avancar(1);
    expect(update).toHaveBeenCalledWith({ status: 'IN_PROGRESS', startedAt: AGORA, serviceMinutes: 20 });
  });

  it('saiu sem atendimento (removido): sai da fila no aparelho', async () => {
    mockHist.mockResolvedValue({ data: [{ id: 'a1', status: 'REMOVED', services: [] }] });
    montar(fila());
    await avancar(1);
    expect(leave).toHaveBeenCalled();
  });

  it('histórico sem o atendimento, ou falhando: nada', async () => {
    mockHist.mockResolvedValueOnce({ data: [] });
    const { result } = montar(fila({ position: 2, initialPosition: 2 }));
    await avancar(1);
    mockHist.mockRejectedValueOnce(new Error('rede'));
    await act(async () => {
      await result.current.refresh();
    });
    expect(leave).not.toHaveBeenCalled();
  });

  it('o poll segue o intervalo: 2 min longe da vez, 1 min perto, 30 s na vez', async () => {
    montar(fila({ estimatedMinutes: 30 }));
    await avancar(1);
    mockWait.mockClear();
    await avancar(120_000);
    expect(mockWait).toHaveBeenCalled();
    montar(fila({ estimatedMinutes: 5 }));
    montar(fila({ estimatedMinutes: 0 }));
    await avancar(60_000);
  });

  it('sem usuário, a consulta não sai', async () => {
    useAuthStore.setState({ accessToken: 'tk', user: null } as never);
    montar(fila());
    await avancar(1);
    expect(mockWait).not.toHaveBeenCalled();
  });
});
