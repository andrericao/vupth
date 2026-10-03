import { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useEstablishments, useVitrinePaginada } from '@hooks/useEstablishments';
import { establishmentService } from '@services/establishmentService';
import { useLocationStore } from '@stores/locationStore';

// Lista paginada (contrato do Backend, 03/10): a vitrine da Home vem de 20 em
// 20 e a próxima página só sai quando a lista chega ao fim, enquanto hasNext.

jest.mock('expo-secure-store');
jest.mock('@services/establishmentService', () => ({
  establishmentService: { getAll: jest.fn(), getPage: jest.fn() },
}));

const mockGetPage = establishmentService.getPage as jest.Mock;
const mockGetAll = establishmentService.getAll as jest.Mock;
let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const pagina = (page: number, ids: string[], hasNext: boolean) => ({
  data: { items: ids.map((id) => ({ id })), page, size: 20, totalItems: 3, totalPages: 2, hasNext },
});

describe('useVitrinePaginada', () => {
  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    mockGetPage.mockReset();
    mockGetAll.mockReset().mockResolvedValue({ data: [] });
    useLocationStore.setState({ hydrated: true, gpsPending: false, coords: null });
  });

  afterEach(() => client.clear());

  it('pede a página 0 e, no fim da lista, a 1 — juntando as duas', async () => {
    mockGetPage.mockImplementation((page: number) =>
      Promise.resolve(page === 0 ? pagina(0, ['a', 'b'], true) : pagina(1, ['c'], false)),
    );
    const { result } = renderHook(() => useVitrinePaginada(true), { wrapper });

    await waitFor(() => expect(result.current.data?.map((e) => e.id)).toEqual(['a', 'b']));
    expect(mockGetPage).toHaveBeenCalledWith(0, null);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(mockGetPage).toHaveBeenCalledWith(1, null);
    expect(result.current.data?.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('o servidor sem paginação devolve o array: uma página, sem próxima', async () => {
    mockGetPage.mockResolvedValue({ data: [{ id: 'a' }] });
    const { result } = renderHook(() => useVitrinePaginada(true), { wrapper });

    await waitFor(() => expect(result.current.data?.map((e) => e.id)).toEqual(['a']));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('desligada (busca ou categoria), não pede nada e diz carregando', () => {
    const { result } = renderHook(() => useVitrinePaginada(false), { wrapper });
    expect(mockGetPage).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });

  it('com coordenada, a página leva a coordenada', async () => {
    useLocationStore.setState({ coords: { latitude: -27.59543, longitude: -48.54812 } });
    mockGetPage.mockResolvedValue(pagina(0, ['a'], false));
    renderHook(() => useVitrinePaginada(true), { wrapper });
    await waitFor(() => expect(mockGetPage).toHaveBeenCalledWith(0, { latitude: -27.595, longitude: -48.548 }));
  });
});

describe('useEstablishments(ligado)', () => {
  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    mockGetAll.mockReset().mockResolvedValue({ data: [] });
    useLocationStore.setState({ hydrated: true, gpsPending: false, coords: null });
  });

  afterEach(() => client.clear());

  it('desligada, a lista inteira não é pedida', () => {
    renderHook(() => useEstablishments(false), { wrapper });
    expect(mockGetAll).not.toHaveBeenCalled();
  });
});
