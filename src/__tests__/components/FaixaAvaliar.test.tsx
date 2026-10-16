import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { FaixaAvaliar } from '@components/FaixaAvaliar';
import { useClientAttendances } from '@hooks/useAttendances';
import { useAuthStore } from '@stores/authStore';
import { useQueueStore } from '@stores/queueStore';
import { useRatedStore } from '@stores/ratedStore';

// notificacao-avaliar (CLI-33): a faixa de avaliar aparece UMA vez no topo,
// fechável; depois, a pendência fica só em Atendimentos.

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@hooks/useAttendances', () => ({ useClientAttendances: jest.fn() }));
const mockAbrir = jest.fn();
jest.mock('@routes/navigationRef', () => ({ abrirAvaliacao: (...a: unknown[]) => mockAbrir(...a) }));

const mockHistory = useClientAttendances as jest.Mock;
const get = SecureStore.getItemAsync as jest.Mock;
const set = SecureStore.setItemAsync as jest.Mock;

const FEITO = {
  id: 'r1',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  status: 'FINISHED',
  scheduledTime: '2026-10-16T14:00:00Z',
  services: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue(null);
  set.mockResolvedValue(undefined);
  mockHistory.mockReturnValue({ data: [FEITO] });
  useAuthStore.setState({ isAuthenticated: true });
  useQueueStore.setState({ activeQueue: null } as never);
  useRatedStore.setState({ ids: [] } as never);
});

describe('FaixaAvaliar', () => {
  it('terminou e não avaliou: a faixa aparece; "Avaliar" abre a avaliação e não volta', async () => {
    const tela = render(<FaixaAvaliar />);
    expect(await tela.findByText('Como foi com Carlos?', {}, { timeout: 15000 })).toBeTruthy();
    fireEvent.press(tela.getByTestId('faixa-avaliar-abrir'));
    expect(mockAbrir).toHaveBeenCalledWith('r1');
    expect(set).toHaveBeenCalledWith('vupth_faixa_avaliar', 'r1');
    expect(tela.queryByTestId('faixa-avaliar')).toBeNull();
  });

  it('fechar some e marca como vista', async () => {
    const tela = render(<FaixaAvaliar />);
    fireEvent.press(await tela.findByTestId('faixa-avaliar-fechar'));
    expect(tela.queryByTestId('faixa-avaliar')).toBeNull();
    expect(mockAbrir).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith('vupth_faixa_avaliar', 'r1');
  });

  it('já vista para este atendimento: não aparece', async () => {
    get.mockResolvedValue('r1');
    const tela = render(<FaixaAvaliar />);
    await act(async () => {});
    expect(tela.queryByTestId('faixa-avaliar')).toBeNull();
  });

  it('um atendimento novo sem avaliar: aparece de novo, uma vez', async () => {
    get.mockResolvedValue('r0');
    const tela = render(<FaixaAvaliar />);
    expect(await tela.findByTestId('faixa-avaliar')).toBeTruthy();
  });

  it('com fila no aparelho, visitante, avaliado ou sem histórico: não aparece', async () => {
    useQueueStore.setState({ activeQueue: { attendanceId: 'x' } } as never);
    const t1 = render(<FaixaAvaliar />);
    await act(async () => {});
    expect(t1.queryByTestId('faixa-avaliar')).toBeNull();
    t1.unmount();

    useQueueStore.setState({ activeQueue: null } as never);
    useAuthStore.setState({ isAuthenticated: false });
    const t2 = render(<FaixaAvaliar />);
    await act(async () => {});
    expect(t2.queryByTestId('faixa-avaliar')).toBeNull();
    t2.unmount();

    useAuthStore.setState({ isAuthenticated: true });
    useRatedStore.setState({ ids: ['r1'] } as never);
    const t3 = render(<FaixaAvaliar />);
    await act(async () => {});
    expect(t3.queryByTestId('faixa-avaliar')).toBeNull();
    t3.unmount();

    mockHistory.mockReturnValue({ data: undefined });
    const t4 = render(<FaixaAvaliar />);
    await act(async () => {});
    expect(t4.queryByTestId('faixa-avaliar')).toBeNull();
  });

  it('o armazenamento falhando: aparece, e fechar não quebra', async () => {
    get.mockRejectedValue(new Error('x'));
    set.mockRejectedValue(new Error('x'));
    const tela = render(<FaixaAvaliar />);
    fireEvent.press(await tela.findByTestId('faixa-avaliar-fechar'));
    await waitFor(() => expect(tela.queryByTestId('faixa-avaliar')).toBeNull());
  });
});
