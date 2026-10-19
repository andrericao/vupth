import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { SaibaMaisDoPreco } from '@components/SaibaMaisDoPreco';
import { SUPORTE_PRECO_URL } from '@utils/suporte';

// saiba-mais-leva-ao-suporte + politica-de-preco-saiba-mais (Andre, 18/10, DEC-91
// e DEC-96): o "Saiba mais" do preço abre SÓ o artigo do nosso Suporte. A
// explicação e a citação do Asaas moram lá; o app não aponta direto para o Asaas.
describe('SaibaMaisDoPreco', () => {
  afterEach(() => jest.restoreAllMocks());

  it('a URL do artigo é a estável do Suporte, escrita por inteiro', () => {
    expect(SUPORTE_PRECO_URL).toBe('https://vupth-support.pages.dev/artigos/cliente/por-que-o-preco-muda.html');
    expect(SUPORTE_PRECO_URL).not.toMatch(/asaas/i);
  });

  it('o toque abre o artigo no navegador do sistema', () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByTestId, getByText } = renderWithProviders(<SaibaMaisDoPreco />);
    expect(getByText('Saiba mais')).toBeTruthy();
    fireEvent.press(getByTestId('preco-saiba-mais'));
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(abrir).toHaveBeenCalledWith(SUPORTE_PRECO_URL);
  });

  it('sem navegador para abrir, o toque não derruba a tela', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sem navegador'));
    const { getByTestId } = renderWithProviders(<SaibaMaisDoPreco />);
    fireEvent.press(getByTestId('preco-saiba-mais'));
    await Promise.resolve();
    expect(getByTestId('preco-saiba-mais')).toBeTruthy();
  });
});
