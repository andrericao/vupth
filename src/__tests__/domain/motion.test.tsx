import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { EASE, MS, movimentoReduzido, useMovimentoReduzido } from '@utils/motion';

describe('motion', () => {
  afterEach(() => jest.restoreAllMocks());

  it('movimento reduzido: lê o ajuste do aparelho', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await expect(movimentoReduzido()).resolves.toBe(true);
  });

  it('sem o módulo (web, jest) anima como o resto, em vez de ficar sem retorno', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('sem módulo'));
    await expect(movimentoReduzido()).resolves.toBe(false);
  });

  it('o hook acompanha a mudança feita nos ajustes com o app aberto', async () => {
    let avisar: (v: boolean) => void = () => {};
    const remover = jest.fn();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_: string, fn: (v: boolean) => void) => {
      avisar = fn;
      return { remove: remover };
    }) as never);
    const { result, unmount } = renderHook(() => useMovimentoReduzido());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(false);
    act(() => avisar(true));
    expect(result.current).toBe(true);
    unmount();
    expect(remover).toHaveBeenCalled();
  });

  it('o retorno ao toque é o mais rápido dos tempos, e as curvas existem', () => {
    expect(MS.toque).toBeLessThan(MS.entrada);
    expect(MS.toque).toBeLessThanOrEqual(150);
    expect(typeof EASE.entrada(0.5)).toBe('number');
    expect(typeof EASE.varredura(0.5)).toBe('number');
    expect(typeof EASE.saida(0.5)).toBe('number');
  });
});
