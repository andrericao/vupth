import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useMultasPendentes } from '@hooks/useMultasPendentes';
import { penaltyService } from '@services/penaltyService';

let mockToken: string | null = 'tk';
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: mockToken }),
}));
jest.mock('@services/penaltyService', () => ({ penaltyService: { listPending: jest.fn() } }));

const lista = penaltyService.listPending as jest.Mock;
const RESPOSTA = { total: 3, penalties: [{ penaltyId: 'm1', type: 'LATE_CANCEL', amount: 3 }] };

describe('useMultasPendentes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = 'tk';
    lista.mockResolvedValue({ data: RESPOSTA });
  });

  it('lê as multas ao montar', async () => {
    const { result } = renderHook(() => useMultasPendentes());
    await waitFor(() => expect(result.current.data).toEqual(RESPOSTA));
    expect(lista).toHaveBeenCalledWith('tk');
  });

  it('refetch lê de novo', async () => {
    const { result } = renderHook(() => useMultasPendentes());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    await act(async () => result.current.refetch());
    expect(lista).toHaveBeenCalledTimes(2);
  });

  it('sem login, não lê', () => {
    mockToken = null;
    const { result } = renderHook(() => useMultasPendentes());
    expect(lista).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('falha de rede deixa sem multa, sem quebrar', async () => {
    lista.mockRejectedValue(new Error('rede'));
    const { result } = renderHook(() => useMultasPendentes());
    await act(async () => {});
    expect(result.current.data).toBeNull();
  });
});
