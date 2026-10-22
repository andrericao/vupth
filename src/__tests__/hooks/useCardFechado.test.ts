import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { useCardFechado } from '@hooks/useCardFechado';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn() }));

const get = SecureStore.getItemAsync as jest.Mock;
const set = SecureStore.setItemAsync as jest.Mock;

describe('useCardFechado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(null);
    set.mockResolvedValue(undefined);
  });

  it('começa aberto e o fechar guarda a chave', async () => {
    const { result } = renderHook(() => useCardFechado('avaliar_a1'));
    expect(result.current.fechado).toBe(false);
    act(() => result.current.fechar());
    expect(result.current.fechado).toBe(true);
    await waitFor(() => expect(set).toHaveBeenCalledWith('vupth_card_fechado_avaliar_a1', '1'));
  });

  it('já fechado antes: volta fechado', async () => {
    get.mockResolvedValue('1');
    const { result } = renderHook(() => useCardFechado('repetir_a1'));
    await waitFor(() => expect(result.current.fechado).toBe(true));
  });

  it('outro atendimento (outra chave) volta aberto', async () => {
    get.mockImplementation(async (k: string) => (k.endsWith('a1') ? '1' : null));
    const { result, rerender } = renderHook(({ k }: { k: string }) => useCardFechado(k), { initialProps: { k: 'avaliar_a1' } });
    await waitFor(() => expect(result.current.fechado).toBe(true));
    rerender({ k: 'avaliar_a2' });
    expect(result.current.fechado).toBe(false);
  });

  it('sem chave não há o que fechar; falha do armazenamento não quebra', async () => {
    const semChave = renderHook(() => useCardFechado(null));
    act(() => semChave.result.current.fechar());
    expect(semChave.result.current.fechado).toBe(false);
    expect(set).not.toHaveBeenCalled();
    get.mockRejectedValue(new Error('x'));
    set.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useCardFechado('c'));
    act(() => result.current.fechar());
    await act(async () => {});
    expect(result.current.fechado).toBe(true);
  });
});
