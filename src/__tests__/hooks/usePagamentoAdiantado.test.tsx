import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { usePagamentoAdiantado } from '@hooks/usePagamentoAdiantado';
import { useAuthStore } from '@stores/authStore';

// agendar-com-pagamento-adiantado (DEC-105/115): so o prepay_required liga o aviso.

const mockAbsences = jest.fn();
jest.mock('@services/penaltyService', () => ({
  penaltyService: { absences: (...a: unknown[]) => mockAbsences(...a) },
}));
jest.mock('expo-secure-store');

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ accessToken: 'tk' } as never);
});

describe('usePagamentoAdiantado', () => {
  it('com prepay_required, exige; sem, não', async () => {
    mockAbsences.mockResolvedValue({ data: { absence_count: 3, absence_limit: 3, prepay_required: true } });
    const com = renderHook(() => usePagamentoAdiantado(true), { wrapper });
    await waitFor(() => expect(com.result.current).toBe(true));
    com.unmount();
    mockAbsences.mockResolvedValue({ data: { absence_count: 1, absence_limit: 3, prepay_required: false } });
    const sem = renderHook(() => usePagamentoAdiantado(true), { wrapper });
    await waitFor(() => expect(mockAbsences).toHaveBeenCalledTimes(2));
    expect(sem.result.current).toBe(false);
  });

  it('fechado, sem conta ou com falha, não exige nem lê', async () => {
    const fechado = renderHook(() => usePagamentoAdiantado(false), { wrapper });
    expect(fechado.result.current).toBe(false);
    expect(mockAbsences).not.toHaveBeenCalled();
    fechado.unmount();
    useAuthStore.setState({ accessToken: null } as never);
    const sem = renderHook(() => usePagamentoAdiantado(true), { wrapper });
    expect(sem.result.current).toBe(false);
    expect(mockAbsences).not.toHaveBeenCalled();
    sem.unmount();
    useAuthStore.setState({ accessToken: 'tk' } as never);
    mockAbsences.mockRejectedValue(new Error('x'));
    const falha = renderHook(() => usePagamentoAdiantado(true), { wrapper });
    await waitFor(() => expect(mockAbsences).toHaveBeenCalled());
    expect(falha.result.current).toBe(false);
  });
});
