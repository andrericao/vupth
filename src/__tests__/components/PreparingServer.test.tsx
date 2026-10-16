import { act } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { PreparingServer } from '@components/PreparingServer';

// abertura-profissional (15/10): a abertura e a da marca — o "V" e os pontos
// andando, sem citar servidor.

afterEach(() => {
  jest.useRealTimers();
});

describe('PreparingServer', () => {
  it('mostra o V e o indicador, sem citar o servidor', () => {
    const { getByTestId, queryByText, unmount } = renderWithProviders(<PreparingServer />);
    expect(getByTestId('brand-mark')).toBeTruthy();
    expect(getByTestId('abertura-indicador')).toBeTruthy();
    expect(queryByText(/servidor/i)).toBeNull();
    unmount();
  });

  it('os pontos andam e param ao sair', () => {
    jest.useFakeTimers();
    const { getByTestId, unmount } = renderWithProviders(<PreparingServer />);
    act(() => {
      jest.advanceTimersByTime(1300);
    });
    expect(getByTestId('abertura-indicador')).toBeTruthy();
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
