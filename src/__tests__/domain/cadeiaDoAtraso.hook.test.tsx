import { Alert } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useQueueCountdown } from '@hooks/useQueueCountdown';
import { useAvisoDeAtraso } from '@hooks/useAvisoDeAtraso';
import { attendanceService } from '@services/attendanceService';
import { queueService } from '@services/queueService';
import { useAuthStore } from '@stores/authStore';
import { useCienciaStore } from '@stores/cienciaStore';
import { useQueueStore } from '@stores/queueStore';

// q292 reprovou em 25/09: marcado o atraso, nenhum aviso. A causa provável
// (LATE fora da reconstrução da fila) foi corrigida em 81d168c1. Este teste
// cobre a CADEIA inteira que o aviso precisa, do jeito que ela roda no app:
// fila no aparelho aguardando → o poll lê o histórico → o status vira LATE →
// o aviso aparece e espera o toque.

jest.mock('expo-secure-store');
jest.mock('@services/attendanceService', () => ({
  attendanceService: { listClientHistory: jest.fn() },
}));
jest.mock('@services/queueService', () => ({
  queueService: { getWaitTime: jest.fn() },
}));

const mockHistory = attendanceService.listClientHistory as jest.Mock;
const mockWait = queueService.getWaitTime as jest.Mock;

describe('a cadeia do aviso de atraso', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useAuthStore.setState({ accessToken: 'tk', user: { id: 'u1' } } as never);
    useCienciaStore.setState({ ids: [] });
    useQueueStore.setState({
      activeQueue: {
        attendanceId: 'a1', professionalId: 'p1', professionalName: 'Carlos',
        establishmentId: 'e1', establishmentName: 'Barbearia',
        enteredAt: Date.now() - 20 * 60000, estimatedMinutes: 20, status: 'SCHEDULED',
      },
    } as never);
  });

  it('o profissional marca o atraso: o poll traz LATE e o aviso aparece, sem fechar por fora', async () => {
    // Chamado e atrasado, o wait-time pode falhar — o poll não pode depender dele.
    mockWait.mockRejectedValue(new Error('404'));
    mockHistory.mockResolvedValue({ data: [{ id: 'a1', status: 'LATE', services: [] }] });

    renderHook(() => {
      useQueueCountdown();
      useAvisoDeAtraso();
    });

    await waitFor(() => expect(useQueueStore.getState().activeQueue?.status).toBe('LATE'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Array),
        { cancelable: false },
      ),
    );
  });

  it('com o lateCount do wait-time (Backend e328629), o aviso diz qual atraso é', async () => {
    mockWait.mockResolvedValue({
      data: { attendanceId: 'a1', position: 2, estimatedWaitingTime: 10, lateCount: 2, latesUntilPenalty: 1 },
    });
    mockHistory.mockResolvedValue({ data: [{ id: 'a1', status: 'LATE', services: [] }] });

    renderHook(() => {
      useQueueCountdown();
      useAvisoDeAtraso();
    });

    await waitFor(() => expect(useQueueStore.getState().activeQueue?.lateCount).toBe(2));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/Este é o seu 2º atraso/),
        expect.any(Array),
        { cancelable: false },
      ),
    );
  });
});
