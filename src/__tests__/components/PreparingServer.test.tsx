import { AccessibilityInfo } from 'react-native';
import { act } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { PreparingServer } from '@components/PreparingServer';

// cobertura-98 (08/10): a tela de "preparando servidor" avanca os passos — com
// a animacao, e sem ela para quem pediu menos movimento.

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.setTimeout(90000);

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('PreparingServer', () => {
  it('com animação, os passos andam', async () => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { getByText, unmount } = renderWithProviders(<PreparingServer />);
    expect(getByText('Abrindo o app')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    unmount();
  });

  it('com menos movimento, troca o passo direto', async () => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { findByText, unmount } = renderWithProviders(<PreparingServer />);
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(850);
    });
    expect(await findByText('Chegando na loja')).toBeTruthy();
    unmount();
  });
});
