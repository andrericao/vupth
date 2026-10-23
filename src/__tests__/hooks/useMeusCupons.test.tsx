import { renderHook, waitFor } from '@testing-library/react-native';

import { useMeusCupons } from '@hooks/useMeusCupons';
import { useAuthStore } from '@stores/authStore';

// cupom-em-configuracoes: so os cupons ativos entram na escolha do corte.

const mockListMine = jest.fn();
jest.mock('@services/campaignService', () => ({
  campaignService: { listMine: (...a: unknown[]) => mockListMine(...a) },
}));
jest.mock('expo-secure-store');
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (fn: () => void) => useEffect(fn, [fn]) };
});

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ accessToken: 'tk' } as never);
});

describe('useMeusCupons', () => {
  it('devolve só os ativos', async () => {
    mockListMine.mockResolvedValue({
      data: [{ id: 'a', status: 'ACTIVE' }, { id: 'b', status: 'USED' }, { id: 'c', status: 'EXPIRED' }],
    });
    const { result } = renderHook(() => useMeusCupons());
    await waitFor(() => expect(result.current.map((c) => c.id)).toEqual(['a']));
  });

  it('sem conta não lê; com falha ou resposta fora do formato, lista vazia', async () => {
    useAuthStore.setState({ accessToken: null } as never);
    const sem = renderHook(() => useMeusCupons());
    expect(sem.result.current).toEqual([]);
    expect(mockListMine).not.toHaveBeenCalled();
    sem.unmount();
    useAuthStore.setState({ accessToken: 'tk' } as never);
    mockListMine.mockRejectedValueOnce(new Error('x'));
    const falha = renderHook(() => useMeusCupons());
    await waitFor(() => expect(mockListMine).toHaveBeenCalledTimes(1));
    expect(falha.result.current).toEqual([]);
    mockListMine.mockResolvedValueOnce({ data: null });
    const torta = renderHook(() => useMeusCupons());
    await waitFor(() => expect(mockListMine).toHaveBeenCalledTimes(2));
    expect(torta.result.current).toEqual([]);
  });
});
