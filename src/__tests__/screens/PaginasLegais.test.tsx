import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Privacy, Terms } from '@screens/Terms';
import { ExcluirConta } from '@screens/ExcluirConta';

// paginas-legais (Evolucao, Degrau 1, 08/10): /privacidade, /termos e
// /excluir-conta na web — as URLs que a Play Store pede.

const mockNavigate = jest.fn();

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), canGoBack: () => true }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

describe('páginas legais', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('Termos abre nos Termos de Uso', () => {
    const { getByText, queryByText } = renderWithProviders(<Terms />);
    expect(getByText('1. Aceitação')).toBeTruthy();
    expect(queryByText('1. Quem somos')).toBeNull();
  });

  it('/privacidade abre já na Privacidade, com quem responde e o contato', () => {
    const { getByText, queryByText } = renderWithProviders(<Privacy />);
    expect(getByText('1. Quem somos')).toBeTruthy();
    expect(getByText('7. Por quanto tempo guardamos')).toBeTruthy();
    expect(getByText(/excluir-conta/)).toBeTruthy();
    expect(getByText(/35 dias/)).toBeTruthy();
    // empresa-nas-paginas-legais (CLI-13): o responsável é a empresa, com o e-mail de contato.
    expect(getByText(/Os Paulo's/)).toBeTruthy();
    expect(getByText(/andrericao49@gmail.com/)).toBeTruthy();
    expect(queryByText(/pessoa física/)).toBeNull();
  });

  it('a aba troca para os Termos', () => {
    const { getByTestId, getByText } = renderWithProviders(<Privacy />);
    fireEvent.press(getByTestId('tab-uso'));
    expect(getByText('1. Aceitação')).toBeTruthy();
  });

  it('/excluir-conta diz como excluir nos dois apps e na web, e o que é apagado', () => {
    const { getByText, getAllByText, queryByText } = renderWithProviders(<ExcluirConta />);
    expect(getByText('No app do cliente')).toBeTruthy();
    expect(getByText('No app do profissional (VUPTH Parceiros)')).toBeTruthy();
    expect(getByText('Pela web, sem o app')).toBeTruthy();
    expect(getByText('Esqueceu a senha')).toBeTruthy();
    expect(getByText('O que é apagado')).toBeTruthy();
    // Guia de texto 4.7: o caminho escrito usa o nome do link do Perfil (no app e na web).
    expect(getAllByText(/Perfil → Dados cadastrais → Excluir conta/)).toHaveLength(2);
    expect(getByText(/Conta → Excluir,/)).toBeTruthy();
    expect(queryByText(/Deletar/)).toBeNull();
  });

  it('"Ir para o Perfil" volta ao Perfil (Entrar ou Excluir conta)', () => {
    const { getByTestId } = renderWithProviders(<ExcluirConta />);
    fireEvent.press(getByTestId('ir-para-o-perfil'));
    expect(mockNavigate).toHaveBeenCalledWith('settings', undefined, { pop: true });
  });
});
