import { fireEvent } from '@testing-library/react-native';

import { Terms } from '@screens/Terms';
import { ExcluirConta } from '@screens/ExcluirConta';
import { coresDoTema } from '@domain/tema';
import { TEMAS, corDe, fundoSobre, razao, renderNoTema, voltarAoClaro } from '../utils/nosDoisTemas';

// DEC-75: Termos e Excluir conta nos dois temas. O erro que isto evita: a aba
// ativa e o botao "Ir para o Perfil" eram forest com texto green, e forest no
// escuro e a surface: o botao ficava um retangulo quase da cor da tela.

jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.setTimeout(90000);

const cor = (tema: 'claro' | 'escuro') => coresDoTema(tema);

describe('Terms: as abas', () => {
  it.each(TEMAS)('%s: a aba ativa usa o par selecionado e a outra textSecondary sobre a surface', (tema) => {
    const { getByText } = renderNoTema(tema, <Terms />);
    const ativa = getByText('Termos de Uso');
    expect(corDe(ativa)).toBe(cor(tema).onSelecionado);
    expect(fundoSobre(ativa)).toBe(cor(tema).selecionado);
    expect(razao(corDe(ativa)!, cor(tema).selecionado)).toBeGreaterThanOrEqual(4.5);

    const outra = getByText('Privacidade');
    expect(corDe(outra)).toBe(cor(tema).textSecondary);
    expect(fundoSobre(outra)).toBe(cor(tema).surface);
    expect(razao(corDe(outra)!, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('no claro e o que era: forest com texto green, e a troca de aba move o par', () => {
    const { getByText } = renderNoTema('claro', <Terms />);
    expect([corDe(getByText('Termos de Uso')), fundoSobre(getByText('Termos de Uso'))]).toEqual(['#9FE870', '#163300']);
    fireEvent.press(getByText('Privacidade'));
    expect([corDe(getByText('Privacidade')), fundoSobre(getByText('Privacidade'))]).toEqual(['#9FE870', '#163300']);
    expect(corDe(getByText('Termos de Uso'))).toBe('#454745');
  });
});

describe('ExcluirConta', () => {
  it.each(TEMAS)('%s: "Ir para o Perfil" usa o par selecionado e destaca-se do fundo', (tema) => {
    const { getByText } = renderNoTema(tema, <ExcluirConta />);
    const botao = getByText('Ir para o Perfil');
    expect(corDe(botao)).toBe(cor(tema).onSelecionado);
    expect(fundoSobre(botao)).toBe(cor(tema).selecionado);
    expect(razao(corDe(botao)!, cor(tema).selecionado)).toBeGreaterThanOrEqual(4.5);
    // o botao tem de aparecer contra a tela (o forest do escuro quase some nela)
    expect(razao(cor(tema).selecionado, cor(tema).background)).toBeGreaterThanOrEqual(3);
  });

  it('no claro e o que era: forest com texto green', () => {
    const { getByText } = renderNoTema('claro', <ExcluirConta />);
    expect([corDe(getByText('Ir para o Perfil')), fundoSobre(getByText('Ir para o Perfil'))]).toEqual(['#9FE870', '#163300']);
  });

  it.each(TEMAS)('%s: os passos sao textPrimary e textSecondary sobre o fundo da tela', (tema) => {
    const { getByText } = renderNoTema(tema, <ExcluirConta />);
    const titulo = getByText('No app do cliente');
    expect(corDe(titulo)).toBe(cor(tema).textPrimary);
    expect(razao(corDe(titulo)!, fundoSobre(titulo)!)).toBeGreaterThanOrEqual(4.5);
    const corpo = getByText('Conta → Excluir, também com a senha atual.');
    expect(corDe(corpo)).toBe(cor(tema).textSecondary);
    expect(razao(corDe(corpo)!, fundoSobre(corpo)!)).toBeGreaterThanOrEqual(4.5);
  });
});

afterAll(voltarAoClaro);
