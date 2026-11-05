import { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { MOCK_ESTABLISHMENTS } from '@domain/establishment/mockData';
import { filtrarComBusca } from '@domain/establishment/filter';
import type { Establishment } from '@domain/establishment/types';
import { BUSCA_MINIMA, useBuscaDeLojas } from '@hooks/useEstablishments';
import { establishmentService } from '@services/establishmentService';
import { useLocationStore } from '@stores/locationStore';

// busca-alem-do-teto (04/11, fumaça 2026-11-04_113213): a vitrine do servidor tem teto de 200 lojas e a busca
// da Home filtrava só essas 200 — a loja nova (de teste ou real) ficava "Nenhum estabelecimento encontrado".
// A busca agora vai também ao servidor pelo nome (?name=) e as duas listas se juntam.

jest.mock('expo-secure-store');
jest.mock('@services/establishmentService', () => ({
  establishmentService: { getAll: jest.fn() },
}));

// Loja aberta, com espera e profissional: visivel no filtro de disponibilidade (o mock nao traz esses campos).
const base: Establishment = {
  ...MOCK_ESTABLISHMENTS[0],
  open_status: 'OPEN',
  is_open: true,
  estimated_wait_minutes: 10,
  available_professionals: 1,
};
const loja = (id: string, name: string, extra: Partial<Establishment> = {}): Establishment => ({ ...base, id, name, ...extra });

describe('filtrarComBusca', () => {
  const lista = [loja('a', 'Barbearia Alfa'), loja('b', 'Salão Beta')];

  it('sem resposta do servidor, é a busca local de sempre', () => {
    expect(filtrarComBusca(lista, undefined, 'alfa', 'ALL').map((e) => e.id)).toEqual(['a']);
  });

  it('junta a loja que só o servidor achou (fora das 200), depois das locais e sem repetir', () => {
    // o servidor devolve so o que casa com o termo; a local repetida nao duplica
    expect(filtrarComBusca(lista, [loja('z', 'Loja C80273300b')], 'C80273300b', 'ALL').map((e) => e.id)).toEqual(['z']);
    const doServidor = [loja('a', 'Barbearia Alfa'), loja('z', 'Loja Alfaiate')];
    expect(filtrarComBusca(lista, doServidor, 'alfa', 'ALL').map((e) => e.id)).toEqual(['a', 'z']);
  });

  it('a do servidor vale mesmo sem o termo no nome (o servidor casa o nome do profissional)', () => {
    expect(filtrarComBusca(lista, [loja('p', 'Loja do Bairro')], 'dedeco', 'ALL').map((e) => e.id)).toEqual(['p']);
  });

  it('categoria e disponibilidade valem para as do servidor', () => {
    const barbearia = loja('s', 'Loja S', { serviceType: 'BARBER' });
    expect(filtrarComBusca([], [barbearia], 'loja', 'BEAUTY_SALON').map((e) => e.id)).toEqual([]);
    expect(filtrarComBusca([], [barbearia], 'loja', 'BARBER').map((e) => e.id)).toEqual(['s']);
    const semGente = loja('g', 'Loja G', { is_open: false, available_professionals: 0 });
    expect(filtrarComBusca([], [semGente], 'loja', 'ALL').map((e) => e.id)).toEqual([]);
  });

  it('sem texto de busca, ignora o servidor', () => {
    expect(filtrarComBusca(lista, [loja('z', 'Z')], '  ', 'ALL').map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('useBuscaDeLojas', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const mockGetAll = establishmentService.getAll as jest.Mock;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    mockGetAll.mockReset().mockResolvedValue({ data: [{ id: 'z' }] });
    useLocationStore.setState({ coords: null });
  });
  afterEach(() => client.clear());

  it('com menos que BUSCA_MINIMA letras não vai ao servidor', () => {
    renderHook(() => useBuscaDeLojas('a'.repeat(BUSCA_MINIMA - 1)), { wrapper });
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('manda o nome aparado ao servidor', async () => {
    const { result } = renderHook(() => useBuscaDeLojas('  C80273300b '), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'z' }]));
    expect(mockGetAll).toHaveBeenCalledWith(null, 'C80273300b');
  });

  it('desligado (Pra ontem), não busca', () => {
    renderHook(() => useBuscaDeLojas('C80273300b', false), { wrapper });
    expect(mockGetAll).not.toHaveBeenCalled();
  });
});
