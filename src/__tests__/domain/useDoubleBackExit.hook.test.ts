import { renderHook } from '@testing-library/react-native';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { useDoubleBackExit } from '@hooks/useDoubleBackExit';

// useFocusEffect roda o callback na "montagem" e guarda o cleanup pra chamarmos
// manualmente (simula o unmount/blur da tela). Evita precisar de NavigationContainer.
let mockFocusCleanup: (() => void) | void;
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => (() => void) | void) => {
    mockFocusCleanup = cb();
  },
}));

type BackHandlerFn = () => boolean | null | undefined;

describe('useDoubleBackExit (hook)', () => {
  let handler: BackHandlerFn | null;
  let removeSub: jest.Mock;

  beforeEach(() => {
    jest.restoreAllMocks();
    handler = null;
    mockFocusCleanup = undefined;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    removeSub = jest.fn();
    jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_evt, cb) => {
        handler = cb as BackHandlerFn;
        return { remove: removeSub } as unknown as ReturnType<typeof BackHandler.addEventListener>;
      });
    jest.spyOn(ToastAndroid, 'show').mockImplementation(() => undefined);
  });

  it('no Android registra o hardwareBackPress e remove no cleanup', () => {
    renderHook(() => useDoubleBackExit());

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );

    (mockFocusCleanup as () => void)();
    expect(removeSub).toHaveBeenCalled();
  });

  it('1º back mostra toast e bloqueia; 2º back dentro da janela sai', () => {
    renderHook(() => useDoubleBackExit('Voltar de novo pra sair'));
    const nowSpy = jest.spyOn(Date, 'now');

    nowSpy.mockReturnValue(10_000);
    expect(handler!()).toBe(true); // 1º toque: bloqueia o exit
    expect(ToastAndroid.show).toHaveBeenCalledWith('Voltar de novo pra sair', ToastAndroid.SHORT);

    nowSpy.mockReturnValue(10_500); // 500ms depois (< 2000ms)
    expect(handler!()).toBe(false); // 2º toque na janela: deixa sair
  });

  it('2º back FORA da janela bloqueia de novo', () => {
    renderHook(() => useDoubleBackExit());
    const nowSpy = jest.spyOn(Date, 'now');

    nowSpy.mockReturnValue(1_000);
    expect(handler!()).toBe(true);

    nowSpy.mockReturnValue(4_000); // 3000ms depois (> 2000ms)
    expect(handler!()).toBe(true);
  });

  it('no iOS não registra o BackHandler', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    renderHook(() => useDoubleBackExit());

    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  });
});
