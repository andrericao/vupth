import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, StyleSheet, Text, ViewStyle } from 'react-native';

import { NumeroComSalto } from '@components/NumeroComSalto';

// O número da fila que muda dá um salto curto; o texto é o valor final desde o
// primeiro quadro, então quem lê a tela (e os testes) vê o número certo.

const esvaziar = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const escalaDe = (json: unknown) => {
  const estilo = StyleSheet.flatten((json as { props: { style: unknown } }).props.style as ViewStyle);
  return (estilo.transform as { scale: number }[])[0].scale;
};

describe('NumeroComSalto', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('mostra o valor e não anima o primeiro', async () => {
    const { getByText, toJSON } = render(
      <NumeroComSalto valor={3}>
        <Text>3</Text>
      </NumeroComSalto>
    );
    await esvaziar();
    expect(getByText('3')).toBeTruthy();
    expect(escalaDe(toJSON())).toBe(1);
  });

  it('muda o valor: o texto ja e o novo e a escala sobe a 1,1 e volta a 1', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const { getByText, rerender } = render(
      <NumeroComSalto valor={3}>
        <Text>3</Text>
      </NumeroComSalto>
    );
    await esvaziar();
    expect(timing).not.toHaveBeenCalled();
    rerender(
      <NumeroComSalto valor={2}>
        <Text>2</Text>
      </NumeroComSalto>
    );
    expect(getByText('2')).toBeTruthy();
    await esvaziar();
    const alvos = timing.mock.calls.map(([, config]) => (config as { toValue: number }).toValue);
    expect(alvos).toEqual([1.1, 1]);
  });

  it('o mesmo valor de novo não salta', async () => {
    const { rerender, toJSON } = render(
      <NumeroComSalto valor={2}>
        <Text>2</Text>
      </NumeroComSalto>
    );
    rerender(
      <NumeroComSalto valor={2}>
        <Text>2</Text>
      </NumeroComSalto>
    );
    await esvaziar();
    expect(escalaDe(toJSON())).toBe(1);
  });

  it('com movimento reduzido não salta', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { rerender, toJSON } = render(
      <NumeroComSalto valor={3}>
        <Text>3</Text>
      </NumeroComSalto>
    );
    rerender(
      <NumeroComSalto valor={2}>
        <Text>2</Text>
      </NumeroComSalto>
    );
    await esvaziar();
    expect(escalaDe(toJSON())).toBe(1);
  });

  it('desmontar no meio do salto não quebra', async () => {
    const { rerender, unmount } = render(
      <NumeroComSalto valor={3}>
        <Text>3</Text>
      </NumeroComSalto>
    );
    rerender(
      <NumeroComSalto valor={2}>
        <Text>2</Text>
      </NumeroComSalto>
    );
    await esvaziar();
    expect(() => unmount()).not.toThrow();
  });
});
