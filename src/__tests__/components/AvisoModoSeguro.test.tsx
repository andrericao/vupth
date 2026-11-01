import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { renderWithProviders } from '../utils/renderWithProviders';
import { AvisoModoSeguro } from '@components/AvisoModoSeguro';
import { useModoSeguroStore } from '@stores/modoSeguroStore';

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

  // O aviso nao pode ser, ele mesmo, o que derruba a abertura: sem o provider de insets (o App.test o monta sem) ele usa 0.
  it('usa a margem do sistema quando ha provider e 0 quando nao ha (nunca lanca)', () => {
    useModoSeguroStore.setState({ lido: true, seguro: true, quedas: 2 });
    const sem = render(<AvisoModoSeguro />); // sem nenhum provider
    expect(StyleSheet.flatten(sem.getByTestId('aviso-modo-seguro').props.style as never).paddingBottom).toBe(8);
    sem.unmount();
    const com = renderWithProviders(
      <SafeAreaInsetsContext.Provider value={{ top: 0, left: 0, right: 0, bottom: 30 }}>
        <AvisoModoSeguro />
      </SafeAreaInsetsContext.Provider>,
    );
    expect(StyleSheet.flatten(com.getByTestId('aviso-modo-seguro').props.style as never).paddingBottom).toBe(38);
  });
});
