import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { PreparingServer, tamanhoDoV } from '@components/PreparingServer';

// abertura-v-pulsando (17/10): o V branco pulsando sobre o verde da marca, sem
// spinner, sem pontos e sem citar o servidor. Abertura sem piscar (18/10): o V
// continua o do splash, o pulso é de leve e a saída tira o V inteiro de cena.
// Os testes com `rerender` usam o `render` puro: o helper com providers troca a
// árvore inteira e o `getByTestId` já obtido fica apontando para um nó morto.

const esvaziarPromessas = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('PreparingServer', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('mostra o V pulsando no fundo verde, sem indicador e sem citar o servidor', () => {
    const { getByTestId, queryByTestId, queryByText, unmount } = renderWithProviders(<PreparingServer />);
    expect(getByTestId('abertura-v-pulsando')).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('abertura').props.style).backgroundColor).toBe('#2E432F');
    expect(queryByTestId('abertura-indicador')).toBeNull();
    expect(queryByText(/servidor/i)).toBeNull();
    unmount();
  });

  it('o pulso anima a opacidade e a escala, e para ao sair', () => {
    const { getByTestId, unmount } = renderWithProviders(<PreparingServer />);
    const estilo = StyleSheet.flatten(getByTestId('abertura-v-pulsando').props.style);
    expect(estilo.opacity).toBeDefined();
    expect(estilo.transform).toHaveLength(1);
    expect(() => unmount()).not.toThrow();
  });

  it('o V tem o tamanho do V do splash nativo: encolher na passagem era o piscar', () => {
    // 460 de 1284 px no splash.png, com resizeMode "contain": 35,8% da largura.
    expect(tamanhoDoV(390, 844)).toEqual({ width: 140, height: 117 });
    expect(tamanhoDoV(412, 915).width).toBe(148);
    // Tela mais larga que 1284:2778 (tablet): a escala passa a ser a da altura.
    expect(tamanhoDoV(1000, 800).width).toBe(Math.round(460 * (800 / 2778)));
  });

  it('pronto: o V sai e a tela só avisa que pode ser tirada quando a saída termina', async () => {
    jest.useFakeTimers();
    const onSaiu = jest.fn();
    const { getByTestId, rerender } = render(<PreparingServer onSaiu={onSaiu} />);
    rerender(<PreparingServer pronto onSaiu={onSaiu} />);
    await esvaziarPromessas();
    expect(StyleSheet.flatten(getByTestId('abertura').props.style).pointerEvents).toBe('none');
    expect(onSaiu).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(onSaiu).toHaveBeenCalledTimes(1);
  });

  it('com movimento reduzido: sem pulso e a saída é imediata', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const onSaiu = jest.fn();
    const { rerender } = render(<PreparingServer onSaiu={onSaiu} />);
    rerender(<PreparingServer pronto onSaiu={onSaiu} />);
    await esvaziarPromessas();
    expect(onSaiu).toHaveBeenCalledTimes(1);
  });

  it('sai da tela antes de pronto: não avisa ninguém', async () => {
    const onSaiu = jest.fn();
    const { unmount, rerender } = render(<PreparingServer onSaiu={onSaiu} />);
    unmount();
    rerender(<PreparingServer pronto onSaiu={onSaiu} />);
    await esvaziarPromessas();
    expect(onSaiu).not.toHaveBeenCalled();
  });
});
