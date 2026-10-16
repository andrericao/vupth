import { Alert, Modal, StyleSheet } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Aparencia } from '@screens/Aparencia';
import { useFonteStore } from '@stores/fonteStore';

// Andre, 26/09: tema e tamanho da fonte num submenu; a fonte tem demonstração
// e só vale no "Salvar".

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.setTimeout(90000);

describe('Aparência', () => {
  beforeEach(() => useFonteStore.setState({ passo: 0 }));

  it('a demonstração muda com o passo, e nada vale antes do Salvar', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<Aparencia />);
    expect(queryByTestId('janela-da-fonte')).toBeNull();
    fireEvent.press(getByTestId('aparencia-fonte'));
    expect(getByTestId('amostra-titulo').props.style).toBeDefined();
    const tamanho = () => {
      const { StyleSheet } = jest.requireActual('react-native');
      return StyleSheet.flatten(getByTestId('amostra-titulo').props.style).fontSize;
    };
    const antes = tamanho();
    fireEvent.press(getByTestId('fonte-3'));
    expect(tamanho()).toBe(antes + 3);
    expect(useFonteStore.getState().passo).toBe(0);
  });

  it('Salvar aplica o passo escolhido', async () => {
    const { getByTestId } = renderWithProviders(<Aparencia />);
    fireEvent.press(getByTestId('aparencia-fonte'));
    fireEvent.press(getByTestId('fonte-2'));
    await act(async () => {
      fireEvent.press(getByTestId('salvar-fonte'));
    });
    expect(useFonteStore.getState().passo).toBe(2);
  });

  it('o tema escuro ainda não existe: avisa que chega em breve', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<Aparencia />);
    fireEvent.press(getByTestId('aparencia-tema'));
    expect(alerta).toHaveBeenCalledWith('Tema escuro', expect.stringMatching(/em breve/));
    alerta.mockRestore();
  });

  it('cancelar-cortado (09/10): o Cancelar fecha a janela sem salvar, e os botões crescem com a fonte', () => {
    useFonteStore.setState({ passo: 2 });
    const { getByTestId, queryByTestId } = renderWithProviders(<Aparencia />);
    fireEvent.press(getByTestId('aparencia-fonte'));
    expect(StyleSheet.flatten(getByTestId('cancelar-fonte').props.style).minHeight).toBe(54);
    fireEvent.press(getByTestId('fonte-0'));
    fireEvent.press(getByTestId('cancelar-fonte'));
    expect(queryByTestId('janela-da-fonte')).toBeNull();
    expect(useFonteStore.getState().passo).toBe(2);
  });

  it('Salvar sem mudar o passo só fecha; tocar fora ou no voltar do Android também fecha', async () => {
    useFonteStore.setState({ passo: 1 });
    const escolher = jest.spyOn(useFonteStore.getState(), 'escolher');
    const { getByTestId, queryByTestId, UNSAFE_getByType } = renderWithProviders(<Aparencia />);
    // O fundo escuro da janela: o primeiro ancestral com a cor dele e o toque.
    const fundo = () => {
      let no = getByTestId('janela-da-fonte').parent;
      while (no && !(no.props.onPress && StyleSheet.flatten(no.props.style)?.backgroundColor === '#16330073')) no = no.parent;
      return no!;
    };

    fireEvent.press(getByTestId('aparencia-fonte'));
    fireEvent.press(getByTestId('janela-da-fonte'));
    expect(queryByTestId('janela-da-fonte')).not.toBeNull();
    await act(async () => {
      fireEvent.press(getByTestId('salvar-fonte'));
    });
    expect(queryByTestId('janela-da-fonte')).toBeNull();
    expect(escolher).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('aparencia-fonte'));
    act(() => fundo().props.onPress());
    expect(queryByTestId('janela-da-fonte')).toBeNull();

    fireEvent.press(getByTestId('aparencia-fonte'));
    act(() => UNSAFE_getByType(Modal).props.onRequestClose());
    expect(queryByTestId('janela-da-fonte')).toBeNull();
    escolher.mockRestore();
  });
});

