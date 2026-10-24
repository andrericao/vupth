import { StyleSheet, Text as RNText } from 'react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { CaixaDeModal } from '@components/CaixaDeModal';

jest.mock('expo-secure-store');
jest.setTimeout(30000);

// modais-padding-e-rodape (André, 24/10): a caixa base trava o padrão dos modais: altura máxima do
// contêiner, só o miolo rola (24 px de padding) e os botões ficam no rodapé, fora da rolagem.
describe('CaixaDeModal', () => {
  it('a caixa não passa do contêiner e o miolo rola com 24 px de padding', () => {
    const t = renderWithProviders(
      <CaixaDeModal gap={12}>
        <RNText>texto</RNText>
      </CaixaDeModal>,
    );
    expect(StyleSheet.flatten(t.getByTestId('caixa-de-modal').props.style).maxHeight).toBe('100%');
    const rolagem = t.getByTestId('caixa-de-modal-rolagem');
    expect(StyleSheet.flatten(rolagem.props.contentContainerStyle)).toMatchObject({ padding: 24, paddingBottom: 24, gap: 12 });
    expect(StyleSheet.flatten(rolagem.props.style).flexShrink).toBe(1);
    expect(t.queryByTestId('caixa-de-modal-rodape')).toBeNull();
  });

  it('com rodapé, os botões ficam fora da rolagem e o miolo encosta neles', () => {
    const t = renderWithProviders(
      <CaixaDeModal rodape={<RNText>Cancelar</RNText>} testID="caixa">
        <RNText>frase</RNText>
      </CaixaDeModal>,
    );
    const rolagem = t.getByTestId('caixa-rolagem');
    expect(StyleSheet.flatten(rolagem.props.contentContainerStyle).paddingBottom).toBe(8);
    expect(t.getByTestId('caixa-rodape')).toBeTruthy();
    expect(t.getByText('Cancelar')).toBeTruthy();
    // o Cancelar não está dentro da rolagem: nunca fica abaixo da dobra
    expect(rolagem.findAll((n) => n.props?.children === 'Cancelar')).toHaveLength(0);
    expect(rolagem.findAll((n) => n.props?.children === 'frase').length).toBeGreaterThan(0);
  });
});
