import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { AvisoModoSeguro } from '@components/AvisoModoSeguro';
import { useModoSeguroStore } from '@stores/modoSeguroStore';

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 10, left: 0, right: 0 }),
}));

describe('AvisoModoSeguro', () => {
  it('abertura normal (ou ainda lendo): nao aparece', () => {
    useModoSeguroStore.setState({ lido: true, seguro: false, quedas: 0 });
    expect(renderWithProviders(<AvisoModoSeguro />).queryByTestId('aviso-modo-seguro')).toBeNull();
    useModoSeguroStore.setState({ lido: false, seguro: true, quedas: 2 });
    expect(renderWithProviders(<AvisoModoSeguro />).queryByTestId('aviso-modo-seguro')).toBeNull();
  });

  it('em modo seguro: avisa em uma linha e some ao tocar', () => {
    useModoSeguroStore.setState({ lido: true, seguro: true, quedas: 2 });
    const t = renderWithProviders(<AvisoModoSeguro />);
    expect(t.getByText(/Abrimos em modo seguro/)).toBeTruthy();
    fireEvent.press(t.getByTestId('aviso-modo-seguro'));
    expect(t.queryByTestId('aviso-modo-seguro')).toBeNull();
  });
});
