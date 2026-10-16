import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useLembreteDePendencia } from '@hooks/useLembreteDePendencia';
import { usePendenciasAoEscolher } from '@hooks/usePendenciasAoEscolher';
import { paymentService } from '@services/paymentService';
import { useAuthStore } from '@stores/authStore';
import { usePendenciaStore } from '@stores/pendenciaStore';

// lembrete-de-pendencia (CLI-35, DEC-78).

jest.mock('expo-secure-store');
let mockData: unknown[] | undefined;
jest.mock('@hooks/usePagamentosPendentes', () => ({ usePagamentosPendentes: () => ({ data: mockData }) }));
jest.mock('@services/paymentService', () => ({ paymentService: { pendentes: jest.fn() } }));
const pendentes = paymentService.pendentes as jest.Mock;

const DEVE = [{ attendance_id: 'a0', status: 'PENDING', amount: 45 }];

beforeEach(() => {
  jest.clearAllMocks();
  usePendenciaStore.getState().fechar();
});

describe('useLembreteDePendencia', () => {
  it('com pendência, o modal aparece uma vez por abertura', () => {
    mockData = DEVE;
    const { rerender } = renderHook(() => useLembreteDePendencia());
    expect(usePendenciaStore.getState().aviso).toEqual(DEVE);
    act(() => usePendenciaStore.getState().fechar());
    mockData = [...DEVE];
    rerender({});
    expect(usePendenciaStore.getState().aviso).toBeNull();
  });

  it('sem pendência (ou ainda carregando): nada', () => {
    mockData = undefined;
    renderHook(() => useLembreteDePendencia());
    mockData = [];
    renderHook(() => useLembreteDePendencia());
    expect(usePendenciaStore.getState().aviso).toBeNull();
  });
});

describe('usePendenciasAoEscolher', () => {
  it('logado: o que deve; sem itens ou com erro, lista vazia', async () => {
    useAuthStore.setState({ accessToken: 'tk' });
    pendentes.mockResolvedValueOnce({ data: { items: DEVE } });
    const { result, unmount } = renderHook(() => usePendenciasAoEscolher());
    await waitFor(() => expect(result.current).toEqual(DEVE));
    unmount();

    pendentes.mockResolvedValueOnce({ data: {} });
    const dois = renderHook(() => usePendenciasAoEscolher());
    await act(async () => {});
    expect(dois.result.current).toEqual([]);
    dois.unmount();

    pendentes.mockRejectedValueOnce(new Error('x'));
    const tres = renderHook(() => usePendenciasAoEscolher());
    await act(async () => {});
    expect(tres.result.current).toEqual([]);
  });

  it('visitante: não lê; desmontar antes da resposta não grava', async () => {
    useAuthStore.setState({ accessToken: null });
    const visitante = renderHook(() => usePendenciasAoEscolher());
    expect(pendentes).not.toHaveBeenCalled();
    visitante.unmount();

    useAuthStore.setState({ accessToken: 'tk' });
    let soltar: (v: unknown) => void = () => {};
    pendentes.mockReturnValueOnce(new Promise((r) => (soltar = r)));
    const { unmount } = renderHook(() => usePendenciasAoEscolher());
    unmount();
    await act(async () => soltar({ data: { items: DEVE } }));
  });
});
