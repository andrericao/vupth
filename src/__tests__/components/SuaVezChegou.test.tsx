import { renderWithProviders } from '../utils/renderWithProviders';
import { SuaVezChegou } from '@components/SuaVezChegou';

describe('SuaVezChegou', () => {
  it('mostra o aviso em negrito', () => {
    const { getByText, getByTestId } = renderWithProviders(<SuaVezChegou cor="#163300" />);
    expect(getByText('Sua vez chegou!')).toBeTruthy();
    expect(getByTestId('sua-vez-chegou')).toBeTruthy();
  });
  it('com reduzir movimento ligado, nao pulsa', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AccessibilityInfo } = require('react-native');
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { getByText, unmount } = renderWithProviders(<SuaVezChegou cor="#163300" />);
    await Promise.resolve();
    expect(getByText('Sua vez chegou!')).toBeTruthy();
    unmount();
  });
});
