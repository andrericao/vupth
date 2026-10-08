import { renderHook, waitFor, act } from '@testing-library/react-native';

import { useReconciliarFila } from '@hooks/useReconciliarFila';
import { useAuthStore } from '@stores/authStore';
import { useQueueStore } from '@stores/queueStore';

// cobertura-98 (08/10): o servidor diz que ha atendimento e o aparelho nao sabe.

const mockHistory = jest.fn();
const mockJoin = jest.fn();

jest.mock('expo-secure-store');
jest.mock('@services/attendanceService', () => ({
  attendanceService: { listClientHistory: (...a: unknown[]) => mockHistory(...a) },
}));

const ativo = {
  id: 'a1',
  professionalId: 'p1',
  professionalName: 'C',
  establishmentId: 'e1',
  status: 'SCHEDULED',
  scheduledTime: '2026-10-08T10:00:00Z',
  services: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' } as never);
  useQueueStore.setState({ activeQueue: null, joinQueue: mockJoin } as never);
  mockHistory.mockResolvedValue({ data: [ativo] });
  mockJoin.mockResolvedValue(undefined);
});

describe('useReconciliarFila', () => {
  it('reconstrói a fila do servidor quando o aparelho não tem', async () => {
    renderHook(() => useReconciliarFila());
    await waitFor(() => expect(mockJoin).toHaveBeenCalled());
  });

  it('com fila no aparelho, não busca', async () => {
    useQueueStore.setState({ activeQueue: { attendanceId: 'x' } } as never);
    renderHook(() => useReconciliarFila());
    await act(async () => {});
    expect(mockHistory).not.toHaveBeenCalled();
  });

  it('sem nada ativo no servidor, não cria', async () => {
    mockHistory.mockResolvedValue({ data: null });
    renderHook(() => useReconciliarFila());
    await waitFor(() => expect(mockHistory).toHaveBeenCalled());
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('sem rede, tenta de novo na próxima sessão', async () => {
    mockHistory.mockRejectedValueOnce(new Error('rede'));
    const { rerender } = renderHook(() => useReconciliarFila());
    await waitFor(() => expect(mockHistory).toHaveBeenCalledTimes(1));
    act(() => useAuthStore.setState({ isAuthenticated: false, accessToken: null } as never));
    rerender({});
    act(() => useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk2' } as never));
    rerender({});
    await waitFor(() => expect(mockJoin).toHaveBeenCalled());
  });

  it('desmontar antes da resposta não cria', async () => {
    let soltar: (v: unknown) => void = () => {};
    mockHistory.mockReturnValue(new Promise((r) => (soltar = r)));
    const { unmount } = renderHook(() => useReconciliarFila());
    unmount();
    await act(async () => soltar({ data: [ativo] }));
    expect(mockJoin).not.toHaveBeenCalled();
  });
});
