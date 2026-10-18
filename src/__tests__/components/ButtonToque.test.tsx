import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, ViewStyle } from 'react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Button } from '@components/Button';

// O toque tem dois sinais: o fundo muda (`$active-bg`, que ja existia) e a pilula
// encolhe um pouco. O segundo so vale se o estilo `:active` com `transform` chegar
// de verdade ao elemento pressionado, e e isso que este teste confere.

const escalaDe = (el: { props: { style?: unknown } }) => {
  const estilo = StyleSheet.flatten(el.props.style as ViewStyle) ?? {};
  const t = (estilo.transform as { scale?: number }[] | undefined) ?? [];
  return t.find((x) => x.scale !== undefined)?.scale ?? 1;
};

describe('Button: retorno ao toque', () => {
  it('em repouso a escala e 1 e, pressionado, a pilula encolhe para 0,97', () => {
    const { getByTestId } = renderWithProviders(<Button title="Entrar" onPress={() => {}} testID="b" />);
    const botao = getByTestId('b');
    expect(escalaDe(botao)).toBe(1);
    fireEvent(botao, 'pressIn');
    expect(escalaDe(getByTestId('b'))).toBeCloseTo(0.97, 2);
    fireEvent(botao, 'pressOut');
    expect(escalaDe(getByTestId('b'))).toBe(1);
  });

  it('segue disparando o toque', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProviders(<Button title="Entrar" onPress={onPress} testID="b" />);
    fireEvent.press(getByTestId('b'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // O helper com providers troca a arvore no rerender, entao o desabilitado e
  // outra renderizacao: o `isDisabled` do Gluestack e so visual, e o `disabled`
  // de verdade (do Pressable) e que impede o toque.
  it('desabilitado continua sem disparar', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProviders(<Button title="Entrar" onPress={onPress} testID="b" isDisabled />);
    fireEvent.press(getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
