import { StyleSheet } from 'react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { BadgeAgendar } from '@components/BadgeAgendar';

// agendar-ambar (Andre, 18/10): o selo âmbar da loja fechada.

describe('BadgeAgendar', () => {
  it('diz AGENDAR, com o testID pedido', () => {
    const { getByText, getByTestId } = renderWithProviders(<BadgeAgendar testID="x" />);
    expect(getByText('AGENDAR')).toBeTruthy();
    expect(getByTestId('x')).toBeTruthy();
  });

  it('o tamanho pequeno é menor que o normal', () => {
    const grande = renderWithProviders(<BadgeAgendar testID="g" />);
    const pequeno = renderWithProviders(<BadgeAgendar pequeno testID="p" />);
    const px = (r: ReturnType<typeof renderWithProviders>, id: string) =>
      Number(StyleSheet.flatten(r.getByTestId(id).props.style)?.paddingHorizontal ?? 0);
    expect(px(pequeno, 'p')).toBeLessThan(px(grande, 'g'));
  });
});
