import { Alert, Modal, StyleSheet } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Aparencia } from '@screens/Aparencia';
import { useFonteStore } from '@stores/fonteStore';
import { useTemaStore } from '@stores/temaStore';
import { veuDoTema } from '@domain/tema';

// Andre, 26/09: tema e tamanho da fonte num submenu; a fonte tem demonstração
// e só vale no "Salvar".

jest.mock('expo-secure-store');
// A liberacao do escuro (src/theme/liberacao.ts), lida a cada uso.
let mockLiberado = false;
jest.mock('@theme/liberacao', () => ({
  get ESCURO_LIBERADO() {
    return mockLiberado;
  },
}));
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
  beforeEach(() => {
    mockLiberado = false;
    useFonteStore.setState({ passo: 0 });
    useTemaStore.setState({ preferencia: 'claro' });
  });

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

  it('o escuro ainda não está liberado: avisa que chega em breve e a linha mostra Claro', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, queryByTestId } = renderWithProviders(<Aparencia />);
    fireEvent.press(getByTestId('aparencia-tema'));
    expect(alerta).toHaveBeenCalledWith('Tema escuro', expect.stringMatching(/em breve/));
    expect(queryByTestId('janela-do-tema')).toBeNull();
    alerta.mockRestore();
  });

  describe('com o escuro liberado', () => {
    beforeEach(() => {
      mockLiberado = true;
    });

    it('o Tema abre uma janela com Claro, Escuro e Automático, e o claro vem marcado', () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { getByTestId, getByLabelText } = renderWithProviders(<Aparencia />);
      fireEvent.press(getByTestId('aparencia-tema'));
      expect(alerta).not.toHaveBeenCalled();
      expect(getByTestId('janela-do-tema')).toBeTruthy();
      expect(getByLabelText('Tema Claro').props.accessibilityState).toEqual({ selected: true });
      expect(getByLabelText('Tema Escuro').props.accessibilityState).toEqual({ selected: false });
      expect(getByLabelText('Tema Automático')).toBeTruthy();
      alerta.mockRestore();
    });

    it('só vale no Salvar: guarda no aparelho e a linha passa a mostrar a escolha', async () => {
      const { getByTestId, getByText } = renderWithProviders(<Aparencia />);
      fireEvent.press(getByTestId('aparencia-tema'));
      fireEvent.press(getByTestId('tema-escuro'));
      expect(useTemaStore.getState().preferencia).toBe('claro');
      await act(async () => {
        fireEvent.press(getByTestId('salvar-tema'));
      });
      expect(useTemaStore.getState().preferencia).toBe('escuro');
      expect(getByText('Escuro')).toBeTruthy();
    });

    it('Cancelar não muda o tema, e a janela reabre na escolha de agora', () => {
      useTemaStore.setState({ preferencia: 'escuro' });
      const { getByTestId, getByLabelText, queryByTestId } = renderWithProviders(<Aparencia />);
      fireEvent.press(getByTestId('aparencia-tema'));
      fireEvent.press(getByTestId('tema-claro'));
      fireEvent.press(getByTestId('cancelar-tema'));
      expect(queryByTestId('janela-do-tema')).toBeNull();
      expect(useTemaStore.getState().preferencia).toBe('escuro');
      fireEvent.press(getByTestId('aparencia-tema'));
      expect(getByLabelText('Tema Escuro').props.accessibilityState).toEqual({ selected: true });
    });

    it('o véu da janela é o do tema (forest 35% no claro) e Salvar sem mexer não grava', async () => {
      const escolher = jest.spyOn(useTemaStore.getState(), 'escolher');
      const { getByTestId } = renderWithProviders(<Aparencia />);
      fireEvent.press(getByTestId('aparencia-tema'));
      let no = getByTestId('janela-do-tema').parent;
      while (no && !(no.props.onPress && StyleSheet.flatten(no.props.style)?.backgroundColor === veuDoTema('claro'))) no = no.parent;
      expect(no).toBeTruthy();
      await act(async () => {
        fireEvent.press(getByTestId('salvar-tema'));
      });
      expect(escolher).not.toHaveBeenCalled();
      escolher.mockRestore();
    });
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
    const { getByTestId, queryByTestId, UNSAFE_getAllByType } = renderWithProviders(<Aparencia />);
    // O fundo escuro da janela: o primeiro ancestral com a cor dele e o toque.
    const fundo = () => {
      let no = getByTestId('janela-da-fonte').parent;
      while (no && !(no.props.onPress && StyleSheet.flatten(no.props.style)?.backgroundColor === veuDoTema('claro'))) no = no.parent;
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
    // ha duas janelas montadas (Tema e Fonte): o voltar do Android vale na que esta aberta
    act(() => UNSAFE_getAllByType(Modal).find((m) => m.props.visible)!.props.onRequestClose());
    expect(queryByTestId('janela-da-fonte')).toBeNull();
    escolher.mockRestore();
  });
});

