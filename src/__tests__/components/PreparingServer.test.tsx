import { StyleSheet } from 'react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { PreparingServer } from '@components/PreparingServer';

// abertura-v-pulsando (17/10): o V branco pulsando sobre o verde da marca, sem
// spinner, sem pontos e sem citar o servidor.

describe('PreparingServer', () => {
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
    unmount();
  });
});
