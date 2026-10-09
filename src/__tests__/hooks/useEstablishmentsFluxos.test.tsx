import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import {
  useEstablishments,
  usePraOntem,
  useEstablishment,
  useProfessionalsWithQueue,
  useSnapshotDaLoja,
  useEstablishmentHours,
  useVitrinePaginada,
} from '@hooks/useEstablishments';
import { useLocationStore } from '@stores/locationStore';
import { establishmentService } from '@services/establishmentService';

// cobertura-98 (08/10): cada consulta das lojas chama o servico certo e so sai
// com a localizacao decidida.

jest.mock('expo-secure-store');
jest.mock('@services/establishmentService', () => ({
  establishmentService: {
    getAll: jest.fn(),
    getPraOntem: jest.fn(),
    getById: jest.fn(),
    getProfessionalsWithQueue: jest.fn(),
    getHours: jest.fn(),
    getPage: jest.fn(),
  },
}));

const svc = establishmentService as unknown as Record<string, jest.Mock>;
let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useLocationStore.setState({ hydrated: true, gpsPending: false, coords: null } as never);
  svc.getAll.mockResolvedValue({ data: [{ id: 'e1' }] });
  svc.getPraOntem.mockResolvedValue({ data: [{ id: 'e2' }] });
  svc.getById.mockResolvedValue({ data: { id: 'e1' } });
  svc.getProfessionalsWithQueue.mockResolvedValue({ data: { professionals: [{ id: 'p1' }] } });
  svc.getHours.mockResolvedValue({ data: [{ day: 'MONDAY' }] });
  svc.getPage.mockResolvedValue({ data: { content: [{ id: 'e1' }], hasNext: false } });
});

afterEach(() => client.clear());

describe('useEstablishments e o Pra ontem', () => {
  it('a lista sai com a localização decidida', async () => {
    const { result } = renderHook(() => useEstablishments(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'e1' }]));
  });

  it('desligada, não busca e segue "carregando"', async () => {
    const { result } = renderHook(() => useEstablishments(false), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(svc.getAll).not.toHaveBeenCalled();
  });

  it('o Pra ontem busca quando ligado', async () => {
    const { result } = renderHook(() => usePraOntem(true), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'e2' }]));
  });
});

describe('a loja', () => {
  it('a loja pelo id', async () => {
    const { result } = renderHook(() => useEstablishment('e1'), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ id: 'e1' }));
  });

  it('os profissionais com a fila', async () => {
    const { result } = renderHook(() => useProfessionalsWithQueue('e1'), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'p1' }]));
  });

  it('sem profissionais, lista vazia', async () => {
    svc.getProfessionalsWithQueue.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useProfessionalsWithQueue('e1'), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('o snapshot só lê o cache', async () => {
    client.setQueryData(['professionals-with-queue', 'e1'], [{ id: 'p9' }]);
    const { result } = renderHook(() => useSnapshotDaLoja('e1'), { wrapper });
    expect(result.current).toEqual([{ id: 'p9' }]);
    expect(svc.getProfessionalsWithQueue).not.toHaveBeenCalled();
  });

  it('o horário da semana', async () => {
    const { result } = renderHook(() => useEstablishmentHours('e1'), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ day: 'MONDAY' }]));
  });
});

describe('a vitrine paginada', () => {
  it('junta as páginas', async () => {
    const { result } = renderHook(() => useVitrinePaginada(true), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(svc.getPage).toHaveBeenCalledWith(0, null);
  });

  it('desligada, sem dado', () => {
    const { result } = renderHook(() => useVitrinePaginada(false), { wrapper });
    expect(result.current.data).toBeUndefined();
  });
});

describe('as opções das consultas', () => {
  type Opcoes = { retryDelay: (n: number) => number; queryFn: (c: object) => Promise<unknown> };
  function opcoes(chave: unknown[]) {
    return client.getQueryCache().find({ queryKey: chave })!.options as unknown as Opcoes;
  }

  it('a espera entre tentativas cresce e para em 10 s', async () => {
    renderHook(() => useEstablishments(), { wrapper });
    renderHook(() => usePraOntem(true), { wrapper });
    renderHook(() => useVitrinePaginada(true), { wrapper });
    await waitFor(() => expect(svc.getPage).toHaveBeenCalled());
    for (const chave of [['establishments', null, null], ['pra-ontem', null, null], ['establishments-paginas', null, null]]) {
      expect(opcoes(chave).retryDelay(0)).toBe(3000);
      expect(opcoes(chave).retryDelay(9)).toBe(10000);
    }
  });

  it('o snapshot, se buscado, lê os profissionais', async () => {
    renderHook(() => useSnapshotDaLoja('e1'), { wrapper });
    await expect(opcoes(['professionals-with-queue', 'e1']).queryFn({})).resolves.toEqual([{ id: 'p1' }]);
    svc.getProfessionalsWithQueue.mockResolvedValue({ data: {} });
    await expect(opcoes(['professionals-with-queue', 'e1']).queryFn({})).resolves.toEqual([]);
  });
});

