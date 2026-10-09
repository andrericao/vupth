import { renderHook, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { usePedidoDeCorteStore } from '@stores/pedidoDeCorteStore';
import { useFirstRunStore } from '@stores/firstRunStore';
import { usePilulaDeTopo } from '@hooks/usePilulaDeTopo';

// cobertura-98 (08/10): o que o aparelho guarda (pedidos de corte, primeira
// vez) e a pilula de voltar ao topo.

jest.mock('expo-secure-store');

const getItem = SecureStore.getItemAsync as jest.Mock;
const setItem = SecureStore.setItemAsync as jest.Mock;

const pedido = (id: string, professionalId: string) => ({ id, professionalId }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  getItem.mockResolvedValue(null);
  setItem.mockResolvedValue(undefined);
  usePedidoDeCorteStore.setState({ pedidos: [] });
});

describe('pedidoDeCorteStore', () => {
  it('remover e removerDoProfissional tiram e gravam; sem nada a tirar, não gravam', async () => {
    usePedidoDeCorteStore.setState({ pedidos: [pedido('c1', 'p1'), pedido('c2', 'p2')] });
    await usePedidoDeCorteStore.getState().remover('c1');
    expect(usePedidoDeCorteStore.getState().pedidos).toHaveLength(1);
    await usePedidoDeCorteStore.getState().remover('nao-existe');
    await usePedidoDeCorteStore.getState().removerDoProfissional('p2');
    expect(usePedidoDeCorteStore.getState().pedidos).toHaveLength(0);
    await usePedidoDeCorteStore.getState().removerDoProfissional('p9');
    expect(setItem).toHaveBeenCalledTimes(2);
  });

  it('restaurar lê o que estava salvo; cofre quebrado não derruba', async () => {
    getItem.mockResolvedValueOnce(JSON.stringify([pedido('c3', 'p3')]));
    await usePedidoDeCorteStore.getState().restaurar();
    expect(usePedidoDeCorteStore.getState().pedidos).toHaveLength(1);
    getItem.mockRejectedValueOnce(new Error('cofre'));
    await expect(usePedidoDeCorteStore.getState().restaurar()).resolves.toBeUndefined();
  });
});

describe('firstRunStore', () => {
  it('gravar a apresentação vista com o cofre quebrado não derruba', async () => {
    setItem.mockRejectedValue(new Error('cofre'));
    await useFirstRunStore.getState().markOnboardingSeen();
    await useFirstRunStore.getState().markPushAsked();
    expect(useFirstRunStore.getState().onboardingSeen).toBe(true);
  });

  it('ler o cofre quebrado conta como "já viu"', async () => {
    getItem.mockRejectedValue(new Error('cofre'));
    await useFirstRunStore.getState().restoreFirstRun();
    expect(useFirstRunStore.getState()).toEqual(expect.objectContaining({ onboardingSeen: true, pushAsked: true, restored: true }));
  });
});

describe('usePilulaDeTopo', () => {
  it('aparece depois de rolar mais de uma tela, e só re-renderiza quando muda', () => {
    const { result } = renderHook(() => usePilulaDeTopo());
    act(() => result.current.onLayout({ nativeEvent: { layout: { height: 600 } } } as never));
    act(() => result.current.onScroll({ nativeEvent: { contentOffset: { y: 5000 } } } as never));
    expect(result.current.visivel).toBe(true);
    act(() => result.current.onScroll({ nativeEvent: { contentOffset: { y: 5100 } } } as never));
    act(() => result.current.onScroll({ nativeEvent: { contentOffset: { y: 0 } } } as never));
    expect(result.current.visivel).toBe(false);
  });
});
