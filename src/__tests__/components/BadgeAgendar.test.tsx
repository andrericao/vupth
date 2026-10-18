import { StyleSheet } from 'react-native';
import { waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { BadgeAgendar } from '@components/BadgeAgendar';

// loja-fechada (Design, 17/10): o badge amber AGENDAR — a unica caixa alta do
// app, por ser selo e nao frase.

jest.mock('expo-secure-store');

function luminancia(hex: string): number {
  const c = hex.replace('#', '');
  const canal = (i: number) => {
    const v = parseInt(c.slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

jest.setTimeout(60000);

describe('BadgeAgendar', () => {
  it('pilula amber #FFB703 de raio cheio, com o rotulo AGENDAR em forest', async () => {
    const { getByTestId, getByText } = renderWithProviders(<BadgeAgendar testID="b" />);
    // O Gluestack resolve o estilo depois da primeira pintura.
    await waitFor(() => expect(StyleSheet.flatten(getByTestId('b').props.style).backgroundColor).toBe('#FFB703'), {
      timeout: 15000,
    });
    const caixa = StyleSheet.flatten(getByTestId('b').props.style);
    expect(caixa.borderRadius).toBeGreaterThanOrEqual(999);
    expect(caixa.paddingHorizontal).toBe(8);
    expect(caixa.paddingVertical).toBe(2);
    const texto = getByText('AGENDAR');
    const estilo = StyleSheet.flatten(texto.props.style);
    expect(estilo.color).toBe('#163300');
    expect(estilo.fontSize).toBe(12);
  });

  it('o leitor de tela le Agendar, nao as letras', () => {
    const { getByText } = renderWithProviders(<BadgeAgendar />);
    expect(getByText('AGENDAR').props.accessibilityLabel).toBe('Agendar');
  });

  it('o par amber/forest passa de 4,5:1 (7,98:1 no desenho)', () => {
    const [x, y] = [luminancia('#FFB703'), luminancia('#163300')].sort((a, b) => b - a);
    expect((x + 0.05) / (y + 0.05)).toBeGreaterThanOrEqual(7.9);
  });
});
