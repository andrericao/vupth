import { act, renderHook } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import { ReactNode } from 'react';

import { useTelaEmFoco } from '@hooks/useTelaEmFoco';

// estudo-desempenho (DEC-145/146, proposta 4): o polling da tela so roda com a tela em foco.

function navegador(focada: boolean) {
  const ouvintes: Record<string, () => void> = {};
  const nav = {
    isFocused: jest.fn(() => focada),
    addListener: jest.fn((evento: string, fn: () => void) => {
      ouvintes[evento] = fn;
      return jest.fn();
    }),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NavigationContext.Provider value={nav as never}>{children}</NavigationContext.Provider>
  );
  return { nav, ouvintes, wrapper };
}

describe('useTelaEmFoco', () => {
  it('fora de um navegador: sempre em foco (testes e componentes soltos)', () => {
    const { result } = renderHook(() => useTelaEmFoco());
    expect(result.current).toBe(true);
  });

  it('segue os eventos da tela: blur tira o foco, focus devolve; desliga os ouvintes ao sair', () => {
    const { ouvintes, wrapper } = navegador(true);
    const { result, unmount } = renderHook(() => useTelaEmFoco(), { wrapper });
    expect(result.current).toBe(true);
    act(() => ouvintes.blur());
    expect(result.current).toBe(false);
    act(() => ouvintes.focus());
    expect(result.current).toBe(true);
    unmount();
  });

  it('a tela que nasce fora de foco comeca sem foco', () => {
    const { wrapper } = navegador(false);
    const { result } = renderHook(() => useTelaEmFoco(), { wrapper });
    expect(result.current).toBe(false);
  });
});
