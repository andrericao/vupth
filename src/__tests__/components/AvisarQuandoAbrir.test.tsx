import { Alert } from 'react-native';
import type { ReactElement } from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { renderWithProviders as renderBase } from '../utils/renderWithProviders';
import { AvisarQuandoAbrir } from '@components/AvisarQuandoAbrir';
import { AvisosDeHoje } from '@components/AvisosDeHoje';
import { openWatchService } from '@services/openWatchService';
import { establishmentService } from '@services/establishmentService';
import { useAuthStore } from '@stores/authStore';
import { useQueueStore } from '@stores/queueStore';

jest.mock('expo-secure-store');
jest.mock('@services/openWatchService', () => ({
  openWatchService: { pedir: jest.fn(), deHoje: jest.fn(), cancelar: jest.fn() },
}));
jest.mock('@services/establishmentService', () => ({
  establishmentService: { getById: jest.fn() },
}));
jest.setTimeout(30000);

// Os componentes do aviso usam React Query: um cliente novo por teste, sem retentativa e sem cache que segure timer.
const clientes: QueryClient[] = [];
function renderWithProviders(ui: ReactElement) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  clientes.push(cliente);
  return renderBase(<QueryClientProvider client={cliente}>{ui}</QueryClientProvider>);
}
afterEach(() => {
  clientes.splice(0).forEach((c) => c.clear());
});

const servico = openWatchService as jest.Mocked<typeof openWatchService>;

const aviso = (p: Record<string, unknown> = {}) => ({
  id: 'w1',
  establishment_id: 'e1',
  professional_id: null,
  kind: 'NOTIFY_OPEN',
  day: '2026-11-04',
  created_at: '2026-11-04T08:00:00-03:00',
  fired_at: null,
  ...p,
});

// avisar-quando-abrir-tela, fatia 1 (CLI-26, DEC-160).
describe('AvisarQuandoAbrir', () => {
  let alerta: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'tk' });
    useQueueStore.setState({ activeQueue: null });
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alerta.mockRestore());

  it('sem login não aparece', () => {
    useAuthStore.setState({ accessToken: null });
    const t = renderWithProviders(<AvisarQuandoAbrir establishmentId="e1" />);
    expect(t.queryByTestId('avisar-quando-abrir')).toBeNull();
    expect(servico.deHoje).not.toHaveBeenCalled();
  });

  it('logado sem pedido: o Avisar quando abrir pede o aviso da loja', async () => {
    servico.deHoje.mockResolvedValue({ data: [] } as never);
    servico.pedir.mockResolvedValue({ data: aviso() } as never);
    const t = renderWithProviders(<AvisarQuandoAbrir establishmentId="e1" />);
    fireEvent.press(await t.findByTestId('aviso-abrir-pedir'));
    await waitFor(() => expect(servico.pedir).toHaveBeenCalledWith({ establishment_id: 'e1', kind: 'NOTIFY_OPEN', professional_id: undefined }, 'tk'));
    // recarrega a lista de hoje
    await waitFor(() => expect(servico.deHoje).toHaveBeenCalledTimes(2));
  });

  it('já pedido: mostra o pedido e o Cancelar apaga', async () => {
    servico.deHoje.mockResolvedValue({ data: [aviso()] } as never);
    servico.cancelar.mockResolvedValue({} as never);
    const t = renderWithProviders(<AvisarQuandoAbrir establishmentId="e1" />);
    expect(await t.findByTestId('aviso-abrir-pedido')).toBeTruthy();
    expect(t.queryByTestId('aviso-abrir-pedir')).toBeNull();
    fireEvent.press(t.getByTestId('aviso-abrir-cancelar'));
    await waitFor(() => expect(servico.cancelar).toHaveBeenCalledWith('w1', 'tk'));
  });

  it('já avisou hoje: diz que avisou, sem botão', async () => {
    servico.deHoje.mockResolvedValue({ data: [aviso({ fired_at: '2026-11-04T09:00:00-03:00' })] } as never);
    const t = renderWithProviders(<AvisarQuandoAbrir establishmentId="e1" />);
    expect(await t.findByTestId('aviso-abrir-avisou')).toBeTruthy();
    expect(t.queryByTestId('aviso-abrir-pedir')).toBeNull();
  });

  it('com horário marcado nesta loja: também oferece o aviso de fila andando, no profissional', async () => {
    useQueueStore.setState({
      activeQueue: {
        professionalId: 'p1', professionalName: 'Ana', establishmentId: 'e1', establishmentName: 'Loja',
        enteredAt: 0, estimatedMinutes: null, status: 'SCHEDULED',
      },
    });
    servico.deHoje.mockResolvedValue({ data: [] } as never);
    servico.pedir.mockResolvedValue({ data: aviso({ kind: 'QUEUE_MOVING', professional_id: 'p1' }) } as never);
    const t = renderWithProviders(<AvisarQuandoAbrir establishmentId="e1" />);
    fireEvent.press(await t.findByTestId('aviso-fila-andar-pedir'));
    await waitFor(() => expect(servico.pedir).toHaveBeenCalledWith({ establishment_id: 'e1', kind: 'QUEUE_MOVING', professional_id: 'p1' }, 'tk'));
  });

  it('sem horário marcado aqui: não oferece o de fila andando', async () => {
    useQueueStore.setState({
      activeQueue: {
        professionalId: 'p1', professionalName: 'Ana', establishmentId: 'outra', establishmentName: 'Outra',
        enteredAt: 0, estimatedMinutes: null, status: 'SCHEDULED',
      },
    });
    servico.deHoje.mockResolvedValue({ data: [] } as never);
    const t = renderWithProviders(<AvisarQuandoAbrir establishmentId="e1" />);
    expect(await t.findByTestId('aviso-abrir-pedir')).toBeTruthy();
    expect(t.queryByTestId('aviso-fila-andar-pedir')).toBeNull();
  });

  it('limite do dia (429): avisa com a frase do código', async () => {
    servico.deHoje.mockResolvedValue({ data: [] } as never);
    servico.pedir.mockRejectedValue({ response: { status: 429, data: { code: 'OPEN_WATCH_LIMIT' } } });
    const t = renderWithProviders(<AvisarQuandoAbrir establishmentId="e1" />);
    fireEvent.press(await t.findByTestId('aviso-abrir-pedir'));
    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Aviso', 'Você chegou ao limite de avisos de hoje.'));
  });
});

describe('AvisosDeHoje (Perfil)', () => {
  let alerta: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'tk' });
    (establishmentService.getById as jest.Mock).mockResolvedValue({ data: { id: 'e1', name: 'Barbearia do Ricardo' } });
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alerta.mockRestore());

  it('sem pedido pendente, o grupo nem aparece', async () => {
    servico.deHoje.mockResolvedValue({ data: [aviso({ fired_at: '2026-11-04T09:00:00-03:00' })] } as never);
    const t = renderWithProviders(<AvisosDeHoje />);
    await waitFor(() => expect(servico.deHoje).toHaveBeenCalled());
    expect(t.queryByTestId('avisos-de-hoje')).toBeNull();
  });

  it('lista o pedido com o nome da loja e o Cancelar', async () => {
    servico.deHoje.mockResolvedValue({ data: [aviso(), aviso({ id: 'w2', kind: 'QUEUE_MOVING', professional_id: 'p1' })] } as never);
    servico.cancelar.mockResolvedValue({} as never);
    const t = renderWithProviders(<AvisosDeHoje />);
    expect(await t.findByTestId('avisos-de-hoje')).toBeTruthy();
    expect((await t.findAllByText('Barbearia do Ricardo')).length).toBe(2);
    expect(t.getByText('Avisar quando a fila andar · só hoje')).toBeTruthy();
    fireEvent.press(t.getByTestId('aviso-de-hoje-cancelar-w2'));
    await waitFor(() => expect(servico.cancelar).toHaveBeenCalledWith('w2', 'tk'));
  });

  it('cancelar que falha avisa', async () => {
    servico.deHoje.mockResolvedValue({ data: [aviso()] } as never);
    servico.cancelar.mockRejectedValue({ response: { status: 404, data: { code: 'OPEN_WATCH_NOT_FOUND' } } });
    const t = renderWithProviders(<AvisosDeHoje />);
    fireEvent.press(await t.findByTestId('aviso-de-hoje-cancelar-w1'));
    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Aviso', 'Este aviso já não existe.'));
  });
});
