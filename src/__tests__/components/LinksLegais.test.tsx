import { Linking } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { LinksLegais, linkLegal } from '@components/LinksLegais';

// termos-no-rodape (CLI-5, 15/10): os dois links no rodape das telas de entrada.

jest.mock('expo-secure-store');

describe('LinksLegais', () => {
  it('as páginas legais do web do Client: produção e staging', () => {
    expect(linkLegal('termos', 'prod')).toBe('https://vupth.pages.dev/termos');
    expect(linkLegal('privacidade', 'prod')).toBe('https://vupth.pages.dev/privacidade');
    expect(linkLegal('termos', 'dev')).toBe('https://dev.vupth.pages.dev/termos');
  });

  it('mostra os dois links e cada um abre a sua página', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByText, getByTestId } = renderWithProviders(<LinksLegais />);
    expect(getByText('Termos de uso')).toBeTruthy();
    expect(getByText('Política de privacidade')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByTestId('link-termos'));
    });
    expect(abrir).toHaveBeenLastCalledWith(linkLegal('termos'));
    await act(async () => {
      fireEvent.press(getByTestId('link-privacidade'));
    });
    expect(abrir).toHaveBeenLastCalledWith(linkLegal('privacidade'));
    abrir.mockRestore();
  });

  it('sem navegador, o toque não derruba a tela', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sem navegador'));
    const { getByTestId } = renderWithProviders(<LinksLegais />);
    await act(async () => {
      fireEvent.press(getByTestId('link-termos'));
    });
    expect(abrir).toHaveBeenCalled();
    abrir.mockRestore();
  });

  // Dentro do navegador (o Perfil) as telas de Termos e Privacidade ja existem:
  // abrir o site tiraria a pessoa do app para ler o mesmo texto.
  it('com aoAbrir, o toque navega no app e não abre o navegador', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const aoAbrir = jest.fn();
    const { getByTestId } = renderWithProviders(<LinksLegais aoAbrir={aoAbrir} />);
    fireEvent.press(getByTestId('link-termos'));
    expect(aoAbrir).toHaveBeenLastCalledWith('termos');
    fireEvent.press(getByTestId('link-privacidade'));
    expect(aoAbrir).toHaveBeenLastCalledWith('privacidade');
    expect(abrir).not.toHaveBeenCalled();
    abrir.mockRestore();
  });
});
