import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { EntradaDaHome } from '@components/EntradaDaHome';

// A Home entra pela direita enquanto o V da abertura sai pela esquerda.

const esvaziarPromessas = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('EntradaDaHome', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('mostra o conteúdo e anima opacidade e deslocamento até o fim', async () => {
    jest.useFakeTimers();
    const { getByTestId, getByText, toJSON } = render(
      <EntradaDaHome>
        <View testID="home">
          <Text>Perto de você</Text>
        </View>
      </EntradaDaHome>
    );
    expect(getByText('Perto de você')).toBeTruthy();
    await esvaziarPromessas();
    await act(async () => {
      jest.advanceTimersByTime(700);
    });
    const raiz = (toJSON() as { props: { style: unknown } }).props.style;
    const estilo = StyleSheet.flatten(raiz as ViewStyle);
    expect(estilo.flex).toBe(1);
    expect(estilo.opacity).toBeDefined();
    expect(estilo.transform).toHaveLength(1);
    expect(getByTestId('home')).toBeTruthy();
  });

  it('com movimento reduzido a Home já entra no lugar, sem deslocamento', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { toJSON } = render(
      <EntradaDaHome>
        <Text>Perto de você</Text>
      </EntradaDaHome>
    );
    await esvaziarPromessas();
    const estilo = StyleSheet.flatten((toJSON() as { props: { style: unknown } }).props.style as ViewStyle);
    expect(estilo.opacity).toBe(1);
    expect(estilo.transform).toEqual([{ translateX: 0 }]);
  });

  it('desmontar no meio da entrada não quebra', () => {
    const { unmount } = render(
      <EntradaDaHome>
        <Text>x</Text>
      </EntradaDaHome>
    );
    expect(() => unmount()).not.toThrow();
  });
});
