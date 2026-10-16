import { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { usePagamentosPendentes } from '@hooks/usePagamentosPendentes';
import { paymentService } from '@services/paymentService';
import { useAuthStore } from '@stores/authStore';

jest.mock('expo-secure-store');
jest.mock('@services/paymentService', () => ({ paymentService: { pendentes: jest.fn() } }));
const pendentes = paymentService.pendentes as jest.Mock;

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  pendentes.mockReset();
});
afterEach(() => client.clear());

describe('usePagamentosPendentes', () => {
  it('logado: os itens do servidor (sem itens, lista vazia)', async () => {
    useAuthStore.setState({ accessToken: 'tk' });
    pendentes.mockResolvedValueOnce({ data: { count: 1, total: 45, items: [{ attendance_id: 'a1' }] } });
    const { result } = renderHook(() => usePagamentosPendentes(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ attendance_id: 'a1' }]));
    expect(pendentes).toHaveBeenCalledWith('tk');

    pendentes.mockResolvedValueOnce({ data: { count: 0, total: 0 } });
    await result.current.refetch();
    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('visitante: não busca', () => {
    useAuthStore.setState({ accessToken: null });
    renderHook(() => usePagamentosPendentes(), { wrapper });
    expect(pendentes).not.toHaveBeenCalled();
  });
});
