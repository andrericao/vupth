import { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useMostraPosicao } from '@hooks/useMostraPosicao';
import { establishmentService } from '@services/establishmentService';

jest.mock('@services/establishmentService', () => ({
  establishmentService: { getProfessionalsWithQueue: jest.fn() },
}));

const mockGet = establishmentService.getProfessionalsWithQueue as jest.Mock;
let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMostraPosicao', () => {
  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    mockGet.mockReset().mockResolvedValue({
      data: { professionals: [{ id: 'p1', show_position: false }, { id: 'p2', show_position: true }] },
    });
  });

  afterEach(() => client.clear());

  it('busca a lista da loja e segue o interruptor do profissional', async () => {
    const { result } = renderHook(() => useMostraPosicao('e1', 'p2'), { wrapper });
    expect(result.current).toBe(false); // enquanto não sabe, não revela
    await waitFor(() => expect(result.current).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('e1');
  });

  it('escondida pelo profissional', async () => {
    const { result } = renderHook(() => useMostraPosicao('e1', 'p1'), { wrapper });
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('com a lista já no cache (tela da loja / WS), não pede de novo', () => {
    client.setQueryData(['professionals-with-queue', 'e1'], [{ id: 'p2' }]);
    const { result } = renderHook(() => useMostraPosicao('e1', 'p2'), { wrapper });
    expect(result.current).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('sem fila ativa, não busca', () => {
    const { result } = renderHook(() => useMostraPosicao(undefined, undefined), { wrapper });
    expect(result.current).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('resposta sem a lista conta como vazia', async () => {
    mockGet.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useMostraPosicao('e1', 'p1'), { wrapper });
    await waitFor(() => expect(client.getQueryData(['professionals-with-queue', 'e1'])).toEqual([]));
    expect(result.current).toBe(false);
  });
});
