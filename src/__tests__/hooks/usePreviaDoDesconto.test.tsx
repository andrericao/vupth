import { renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { usePreviaDoDesconto } from '@hooks/usePreviaDoDesconto';

// desconto-para-novo-cliente-no-link (CLI-3, Backend 492e705): o visitante que veio de um link
// ve o desconto da previa publica, sem cadastro.

jest.mock('expo-secure-store');
const mockPreview = jest.fn();
jest.mock('@services/campaignService', () => ({
  campaignService: { preview: (...a: unknown[]) => mockPreview(...a) },
}));

const guardado: Record<string, string> = {};
const get = SecureStore.getItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(guardado).forEach((k) => delete guardado[k]);
  get.mockImplementation((k: string) => Promise.resolve(guardado[k] ?? null));
  (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
});

describe('usePreviaDoDesconto', () => {
  it('soma o desconto da previa de cada servico, com a campanha e o codigo do link', async () => {
    guardado.vupth_indicacao_campanha = 'camp-1';
    guardado.vupth_indicacao = 'ABC123';
    mockPreview.mockImplementation((_c: string, servico: string) =>
      Promise.resolve({ data: { discount: servico === 's1' ? 4 : 2.5 } }),
    );
    const { result } = renderHook(() => usePreviaDoDesconto(['s1', 's2'], true));
    await waitFor(() => expect(result.current).toBe(6.5));
    expect(mockPreview).toHaveBeenCalledWith('camp-1', 's1', 'ABC123');
    expect(mockPreview).toHaveBeenCalledWith('camp-1', 's2', 'ABC123');
  });

  // desconto-no-link-cliente (DEC-131): o code que a previa devolve (so com o ref valido) fica guardado para o redeem.
  it('guarda o code da campanha que a previa devolveu, para o resgate depois do cadastro', async () => {
    guardado.vupth_indicacao_campanha = 'camp-1';
    guardado.vupth_indicacao = 'DESC10';
    mockPreview.mockResolvedValue({ data: { discount: 4, code: 'DESC10' } });
    const { result } = renderHook(() => usePreviaDoDesconto(['s1'], true));
    await waitFor(() => expect(result.current).toBe(4));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('vupth_indicacao_cupom', 'DESC10');
  });

  it('previa sem code (campanha publica aberta sem ref): nada guardado', async () => {
    guardado.vupth_indicacao_campanha = 'camp-1';
    mockPreview.mockResolvedValue({ data: { discount: 4 } });
    const { result } = renderHook(() => usePreviaDoDesconto(['s1'], true));
    await waitFor(() => expect(result.current).toBe(4));
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('sem link guardado, logado ou sem servico, nao consulta e o desconto e 0', async () => {
    const sem = renderHook(() => usePreviaDoDesconto(['s1'], true));
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(sem.result.current).toBe(0);
    guardado.vupth_indicacao_campanha = 'camp-1';
    expect(renderHook(() => usePreviaDoDesconto(['s1'], false)).result.current).toBe(0);
    expect(renderHook(() => usePreviaDoDesconto([], true)).result.current).toBe(0);
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it('campanha fora do ar (404) ou sem rede: 0, sem quebrar', async () => {
    guardado.vupth_indicacao_campanha = 'camp-1';
    mockPreview.mockRejectedValue({ response: { status: 404 } });
    const { result } = renderHook(() => usePreviaDoDesconto(['s1'], true));
    await waitFor(() => expect(mockPreview).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });

  it('trocou a selecao: o desconto antigo nao vale para a nova', async () => {
    guardado.vupth_indicacao_campanha = 'camp-1';
    mockPreview.mockResolvedValue({ data: { discount: 3 } });
    const { result, rerender } = renderHook(({ ids }: { ids: string[] }) => usePreviaDoDesconto(ids, true), {
      initialProps: { ids: ['s1'] },
    });
    await waitFor(() => expect(result.current).toBe(3));
    mockPreview.mockResolvedValue({ data: { discount: 7 } });
    rerender({ ids: ['s1', 's2'] });
    expect(result.current).toBe(0);
    await waitFor(() => expect(result.current).toBe(14));
  });
});
