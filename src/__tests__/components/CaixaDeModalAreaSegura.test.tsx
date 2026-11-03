import { Keyboard, StyleSheet, Text as RNText } from 'react-native';
import { act } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { CaixaDeModal } from '@components/CaixaDeModal';

jest.mock('expo-secure-store');
jest.mock('react-native-safe-area-context', () => {
  const real = jest.requireActual('react-native-safe-area-context');
  return { ...real, useSafeAreaInsets: () => ({ top: 30, bottom: 48, left: 0, right: 0 }) };
});
jest.setTimeout(30000);

// cancelar-cortado-no-agendar (André, 03/11, reprovou 20253c1d): no Android edge-to-edge o Modal desenha
// sob as barras do sistema; o véu soma a área segura para o pé da caixa (e o Cancelar) não cair sob a barra.
describe('CaixaDeModal — área segura', () => {
  it('o véu guarda 24 px além da barra de status e da barra de navegação', () => {
    const t = renderWithProviders(
      <CaixaDeModal rodape={<RNText>Cancelar</RNText>} testID="cx">
        <RNText>dias e horários</RNText>
      </CaixaDeModal>,
    );
    const veu = StyleSheet.flatten(t.getByTestId('cx-veu').props.style);
    expect(veu.paddingTop).toBe(24 + 30);
    expect(veu.paddingBottom).toBe(24 + 48);
    // o Cancelar segue no rodapé, com os 24 px embaixo, dentro do cartão
    expect(StyleSheet.flatten(t.getByTestId('cx-rodape').props.style).paddingBottom).toBe(24);
  });

  it('com o teclado aberto, só o topo conta: o teclado já cobre a barra de navegação', () => {
    const ouvintes: Record<string, () => void> = {};
    const espia = jest.spyOn(Keyboard, 'addListener').mockImplementation(((evento: string, fn: () => void) => {
      ouvintes[evento] = fn;
      return { remove: jest.fn() };
    }) as never);
    const t = renderWithProviders(
      <CaixaDeModal rodape={<RNText>Cancelar</RNText>} testID="cx">
        <RNText>campo</RNText>
      </CaixaDeModal>,
    );
    act(() => ouvintes.keyboardDidShow());
    const veu = StyleSheet.flatten(t.getByTestId('cx-veu').props.style);
    expect(veu.paddingTop).toBe(12 + 30);
    expect(veu.paddingBottom).toBe(12);
    espia.mockRestore();
  });
});
