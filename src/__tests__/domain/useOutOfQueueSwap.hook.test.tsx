import { ReactNode } from 'react';
import { Alert } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useOutOfQueueSwap } from '@hooks/useOutOfQueueSwap';
import { swapOfferService } from '@services/swapOfferService';
import { attendanceService } from '@services/attendanceService';
import { useAuthStore } from '@stores/authStore';
import { useQueueStore } from '@stores/queueStore';
import { usePendingSwapStore, PendingSwapContext } from '@stores/pendingSwapStore';

jest.mock('expo-secure-store');
jest.mock('@services/swapOfferService', () => ({
  swapOfferService: { listMine: jest.fn() },
}));
jest.mock('@services/attendanceService', () => ({
  attendanceService: { listClientHistory: jest.fn() },
}));

const mockListMine = swapOfferService.listMine as jest.Mock;
const mockHistory = attendanceService.listClientHistory as jest.Mock;

const ctx: PendingSwapContext = {
  offerId: 'off-1',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  estimatedWaitMinutes: 25,
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// O solicitante FORA da fila não tem WebSocket conectado: o aceite chega por
// poll (a oferta some do /swap-offers/me e o atendimento nasce na vaga cedida).
describe('useOutOfQueueSwap (F8 fatia 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    useQueueStore.setState({ activeQueue: null });
    usePendingSwapStore.setState({ offers: [ctx] });
  });

  it('oferta sumiu + atendimento ativo = troca aceita: entra na fila e avisa', async () => {
    mockListMine.mockResolvedValue({ data: [] });
    mockHistory.mockResolvedValue({
      data: [{ id: 'att-novo', professionalId: 'p1', status: 'SCHEDULED' }],
    });

    renderHook(() => useOutOfQueueSwap(), { wrapper });

    await waitFor(() => expect(useQueueStore.getState().activeQueue).not.toBeNull());
    const active = useQueueStore.getState().activeQueue!;
    expect(active.attendanceId).toBe('att-novo');
    expect(active.professionalName).toBe('Carlos');
    expect(active.estimatedMinutes).toBe(25);
    expect(usePendingSwapStore.getState().offers).toEqual([]);
    expect(Alert.alert).toHaveBeenCalledWith('Troca aceita! 🔄', expect.stringMatching(/Carlos/));
  });

  it('oferta sumiu sem atendimento novo (cancelada/expirada): só limpa o pedido', async () => {
    mockListMine.mockResolvedValue({ data: [] });
    mockHistory.mockResolvedValue({
      data: [{ id: 'antigo', professionalId: 'p1', status: 'FINISHED' }],
    });

    renderHook(() => useOutOfQueueSwap(), { wrapper });

    await waitFor(() => expect(usePendingSwapStore.getState().offers).toEqual([]));
    expect(useQueueStore.getState().activeQueue).toBeNull();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('oferta ainda OPEN: mantém o pedido e não mexe na fila', async () => {
    mockListMine.mockResolvedValue({ data: [{ id: 'off-1' }] });

    renderHook(() => useOutOfQueueSwap(), { wrapper });

    await waitFor(() => expect(mockListMine).toHaveBeenCalled());
    expect(mockHistory).not.toHaveBeenCalled();
    expect(usePendingSwapStore.getState().offers).toEqual([ctx]);
    expect(useQueueStore.getState().activeQueue).toBeNull();
  });

  it('sem pedido pendente não consulta nada', async () => {
    usePendingSwapStore.setState({ offers: [] });

    renderHook(() => useOutOfQueueSwap(), { wrapper });

    await waitFor(() => expect(mockListMine).not.toHaveBeenCalled());
  });
});
