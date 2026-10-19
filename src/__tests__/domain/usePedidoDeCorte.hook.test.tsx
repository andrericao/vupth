import { ReactNode } from 'react';
import { Alert } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { usePedidoDeCorte } from '@hooks/usePedidoDeCorte';
import { attendanceService } from '@services/attendanceService';
import { useAuthStore } from '@stores/authStore';
import { useQueueStore } from '@stores/queueStore';
import { usePedidoDeCorteStore } from '@stores/pedidoDeCorteStore';
import { PedidoDeCorte } from '@domain/queue/pedidoDeCorte';

// O pedido de corte e a resposta que nunca chegava (teste de 25/09): nem o
// WebSocket (só com fila ativa) nem o push alcançavam quem só pediu corte.

jest.mock('expo-secure-store');
const mockAbrirLoja = jest.fn();
jest.mock('@routes/navigationRef', () => ({ abrirLoja: (...a: unknown[]) => mockAbrirLoja(...a) }));
jest.mock('@services/attendanceService', () => ({
  attendanceService: { listClientHistory: jest.fn() },
}));

const mockHistory = attendanceService.listClientHistory as jest.Mock;

const pedido = (over: Partial<PedidoDeCorte> = {}): PedidoDeCorte => ({
  id: 'cr1',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  criadoEm: Date.now() - 60_000,
  expiraEm: Date.now() + 4 * 60_000,
  ...over,
});

// Um client por teste, destruído no afterEach — o hook usa `refetchInterval`.
let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('usePedidoDeCorte', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    useQueueStore.setState({ activeQueue: null });
  });

  afterEach(() => {
    client.clear();
    client.unmount();
  });

  it('aceito: entra na fila com os nomes do pedido, limpa o pedido e avisa', async () => {
    usePedidoDeCorteStore.setState({ pedidos: [pedido()] });
    mockHistory.mockResolvedValue({
      data: [{ id: 'att-novo', professionalId: 'p1', establishmentId: 'e1', status: 'SCHEDULED', scheduledTime: new Date().toISOString(), services: [] }],
    });

    renderHook(() => usePedidoDeCorte(), { wrapper });

    await waitFor(() => expect(useQueueStore.getState().activeQueue).not.toBeNull());
    const fila = useQueueStore.getState().activeQueue!;
    expect(fila.attendanceId).toBe('att-novo');
    expect(fila.professionalName).toBe('Carlos');
    expect(fila.establishmentName).toBe('Barbearia');
    expect(usePedidoDeCorteStore.getState().pedidos).toEqual([]);
    expect(Alert.alert).toHaveBeenCalledWith('Pedido aceito', expect.stringMatching(/Carlos aceitou/));
  });

  it('prazo vencido sem atendimento: avisa que não foi aceito e limpa', async () => {
    usePedidoDeCorteStore.setState({
      pedidos: [pedido({ criadoEm: Date.now() - 10 * 60_000, expiraEm: Date.now() - 5 * 60_000 })],
    });
    mockHistory.mockResolvedValue({ data: [] });

    renderHook(() => usePedidoDeCorte(), { wrapper });

    // Guia de texto §4.6: título que diz o fato, corpo de uma linha e os dois caminhos.
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Pedido não aceito',
        'Carlos não respondeu a tempo.',
        [expect.objectContaining({ text: 'Escolher outro' }), expect.objectContaining({ text: 'Agendar' })],
        { cancelable: false },
      ),
    );
    expect(usePedidoDeCorteStore.getState().pedidos).toEqual([]);
    expect(useQueueStore.getState().activeQueue).toBeNull();
  });

  it('"Escolher outro" abre a loja; "Agendar" abre a loja já nos serviços do mesmo profissional', async () => {
    usePedidoDeCorteStore.setState({
      pedidos: [pedido({ criadoEm: Date.now() - 10 * 60_000, expiraEm: Date.now() - 5 * 60_000 })],
    });
    mockHistory.mockResolvedValue({ data: [] });

    renderHook(() => usePedidoDeCorte(), { wrapper });

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const botoes = (Alert.alert as jest.Mock).mock.calls[0][2] as { text: string; onPress: () => void }[];
    botoes.find((b) => b.text === 'Escolher outro')!.onPress();
    expect(mockAbrirLoja).toHaveBeenLastCalledWith('e1');
    botoes.find((b) => b.text === 'Agendar')!.onPress();
    expect(mockAbrirLoja).toHaveBeenLastCalledWith('e1', 'p1');
  });

  it('dentro do prazo e sem atendimento: não diz nada e mantém o pedido', async () => {
    usePedidoDeCorteStore.setState({ pedidos: [pedido()] });
    mockHistory.mockResolvedValue({ data: [] });

    renderHook(() => usePedidoDeCorte(), { wrapper });

    await waitFor(() => expect(mockHistory).toHaveBeenCalled());
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(usePedidoDeCorteStore.getState().pedidos).toHaveLength(1);
  });

  it('sem pedido guardado, nenhum request', () => {
    usePedidoDeCorteStore.setState({ pedidos: [] });
    renderHook(() => usePedidoDeCorte(), { wrapper });
    expect(mockHistory).not.toHaveBeenCalled();
  });

  it('aceito com fila já no aparelho e sem o nome: só avisa, com "O profissional"', async () => {
    const fila = { attendanceId: 'att-velho' } as never;
    useQueueStore.setState({ activeQueue: fila });
    usePedidoDeCorteStore.setState({ pedidos: [pedido({ professionalName: '' })] });
    mockHistory.mockResolvedValue({
      data: [{ id: 'att-novo', professionalId: 'p1', establishmentId: 'e1', status: 'SCHEDULED', scheduledTime: new Date().toISOString(), services: [] }],
    });

    renderHook(() => usePedidoDeCorte(), { wrapper });

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Pedido aceito', expect.stringMatching(/^O profissional aceitou/)));
    expect(useQueueStore.getState().activeQueue).toBe(fila);
  });

  it('um ainda no prazo e outro vencido sem nome: pula o primeiro e avisa o segundo', async () => {
    usePedidoDeCorteStore.setState({
      pedidos: [
        pedido(),
        pedido({ id: 'cr2', professionalId: 'p2', professionalName: '', criadoEm: Date.now() - 10 * 60_000, expiraEm: Date.now() - 5 * 60_000 }),
      ],
    });
    mockHistory.mockResolvedValue({ data: [] });

    renderHook(() => usePedidoDeCorte(), { wrapper });

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Pedido não aceito', 'O profissional não respondeu a tempo.', expect.any(Array), { cancelable: false }));
    expect(usePedidoDeCorteStore.getState().pedidos.map((p) => p.id)).toEqual(['cr1']);
  });
});

