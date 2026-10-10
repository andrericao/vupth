import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useConviteDeTroca } from '@hooks/useConviteDeTroca';
import { useSwapOffers } from '@hooks/useSwapOffers';
import { swapOfferService } from '@services/swapOfferService';
import { useAuthStore } from '@stores/authStore';
import { useConviteDeTrocaStore } from '@stores/conviteDeTrocaStore';
import { useQueueStore } from '@stores/queueStore';

// cobertura-98: o popup de troca (D16) so busca com o cliente aguardando, e
// mostra so a oferta que ainda nao apareceu.

jest.mock('expo-secure-store');
jest.mock('@services/swapOfferService', () => ({
  swapOfferService: { listAcceptable: jest.fn() },
}));

const listar = swapOfferService.listAcceptable as jest.Mock;
let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function naFila(status: string, attendanceId: string | null = 'at-1') {
  useQueueStore.setState({
    activeQueue: { attendanceId, status, professionalId: 'prof-1' } as never,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ accessToken: 'tok' } as never);
  useQueueStore.setState({ activeQueue: null } as never);
  useConviteDeTrocaStore.setState({ jaMostradas: [], atual: null } as never);
  listar.mockResolvedValue({ data: [] });
});

afterEach(() => client.clear());

describe('useSwapOffers', () => {
  it('busca as ofertas do profissional com o token', async () => {
    listar.mockResolvedValue({ data: [{ id: 'o1' }] });
    const { result } = renderHook(() => useSwapOffers('prof-1', true), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'o1' }]));
    expect(listar).toHaveBeenCalledWith('prof-1', 'tok');
  });

  it('sem profissional, sem token ou desligado: não busca', () => {
    renderHook(() => useSwapOffers(undefined, true), { wrapper });
    renderHook(() => useSwapOffers('prof-1', false), { wrapper });
    useAuthStore.setState({ accessToken: null } as never);
    renderHook(() => useSwapOffers('prof-1', true), { wrapper });
    expect(listar).not.toHaveBeenCalled();
  });
});

describe('useConviteDeTroca', () => {
  it('aguardando na fila: mostra a primeira oferta nova', async () => {
    naFila('SCHEDULED');
    useConviteDeTrocaStore.setState({ jaMostradas: ['o1'] } as never);
    listar.mockResolvedValue({ data: [{ id: 'o1' }, { id: 'o2' }] });
    renderHook(() => useConviteDeTroca(), { wrapper });
    await waitFor(() => expect(useConviteDeTrocaStore.getState().jaMostradas).toContain('o2'));
    expect((useConviteDeTrocaStore.getState() as unknown as { atual: { id: string } }).atual.id).toBe('o2');
  });

  it('todas já mostradas: nada de novo', async () => {
    naFila('SCHEDULED');
    useConviteDeTrocaStore.setState({ jaMostradas: ['o1'] } as never);
    listar.mockResolvedValue({ data: [{ id: 'o1' }] });
    renderHook(() => useConviteDeTroca(), { wrapper });
    await waitFor(() => expect(listar).toHaveBeenCalled());
    expect((useConviteDeTrocaStore.getState() as unknown as { atual: unknown }).atual).toBeNull();
  });

  it('sem ofertas: nada', async () => {
    naFila('SCHEDULED');
    renderHook(() => useConviteDeTroca(), { wrapper });
    await waitFor(() => expect(listar).toHaveBeenCalled());
    expect(useConviteDeTrocaStore.getState().jaMostradas).toEqual([]);
  });

  it('em atendimento ou sem fila: não busca', () => {
    naFila('IN_SERVICE');
    renderHook(() => useConviteDeTroca(), { wrapper });
    naFila('SCHEDULED', null);
    renderHook(() => useConviteDeTroca(), { wrapper });
    useQueueStore.setState({ activeQueue: null } as never);
    renderHook(() => useConviteDeTroca(), { wrapper });
    expect(listar).not.toHaveBeenCalled();
  });
});
