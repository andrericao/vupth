import { renderHook, act } from '@testing-library/react-native';
import { segundosAteAVez, useCronometroDaVez } from '@hooks/useCronometroDaVez';

describe('segundosAteAVez', () => {
  it('conta os segundos ate entrada + minutos estimados', () => {
    expect(segundosAteAVez({ enteredAt: 0, estimatedMinutes: 25 }, 0)).toBe(1500);
    expect(segundosAteAVez({ enteredAt: 0, estimatedMinutes: 25 }, 1500 * 1000 - 500)).toBe(1);
  });
  it('nunca fica negativo', () => {
    expect(segundosAteAVez({ enteredAt: 0, estimatedMinutes: 1 }, 10 * 60000)).toBe(0);
  });
  it('sem previsao devolve null (nao e zero)', () => {
    expect(segundosAteAVez({ enteredAt: 0, estimatedMinutes: null }, 0)).toBeNull();
    expect(segundosAteAVez(undefined, 0)).toBeNull();
  });
});

describe('useCronometroDaVez', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('anda de 1 em 1 segundo enquanto ativo', () => {
    const fila = { enteredAt: Date.now(), estimatedMinutes: 1 };
    const { result } = renderHook(() => useCronometroDaVez(fila, true));
    expect(result.current).toBe(60);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(result.current).toBe(57);
  });
  it('parado quando inativo', () => {
    const fila = { enteredAt: Date.now(), estimatedMinutes: 1 };
    const { result } = renderHook(() => useCronometroDaVez(fila, false));
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current).toBe(60);
  });
});
