import { ScrollView } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { Login } from '@screens/Login';
import { SignUp } from '@screens/SignUp';
import { ForgotPassword } from '@screens/ForgotPassword';
import { CompleteProfile } from '@screens/CompleteProfile';
import { coresDoTema } from '@domain/tema';
import { TEMAS, corDe, estilo, fundoSobre, razao, renderNoTema, voltarAoClaro } from '../utils/nosDoisTemas';

// DEC-75: as telas de entrada nos dois temas. O erro que isto evita: o fundo da
// rolagem era `#FFFFFF` fixo (uma tela branca no meio do app escuro), os titulos
// e os links eram forest sobre o fundo da tela (1:1 no escuro) e os icones hex.

let mockParams: object = {};

jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return new Proxy(
    {},
    { get: (_t, nome) => (props: { color?: string }) => createElement(View, { testID: `icone-${String(nome)}`, cor: props.color }) },
  );
});
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn(), replace: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ login: jest.fn(), register: jest.fn(), accessToken: 'tk', updateUser: jest.fn() }),
}));
jest.mock('@services/healthService', () => ({ waitForBackend: jest.fn().mockResolvedValue(true) }));
jest.mock('@services/authService', () => ({
  authService: { forgotPassword: jest.fn().mockResolvedValue({}), resetPassword: jest.fn().mockResolvedValue({}) },
}));
jest.mock('@components/LinksLegais', () => ({ LinksLegais: () => null }));
jest.mock('@components/VersaoDoApp', () => ({ VersaoDoApp: () => null }));

jest.setTimeout(90000);

const cor = (tema: 'claro' | 'escuro') => coresDoTema(tema);

beforeEach(() => {
  mockParams = {};
});

describe('Login', () => {
  it.each(TEMAS)('%s: o fundo da rolagem e o da tela, o titulo e o link sao textPrimary', (tema) => {
    const { getByText, UNSAFE_getAllByType } = renderNoTema(tema, <Login />);
    expect(estilo(UNSAFE_getAllByType(ScrollView)[0]).backgroundColor).toBe(cor(tema).background);

    const titulo = getByText('OLÁ DE NOVO');
    expect(corDe(titulo)).toBe(cor(tema).textPrimary);
    expect(razao(corDe(titulo)!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);
    expect(corDe(getByText('Criar conta'))).toBe(cor(tema).textPrimary);
  });

  it('no claro e o que era: branco e forest', () => {
    const { getByText, UNSAFE_getAllByType } = renderNoTema('claro', <Login />);
    expect(estilo(UNSAFE_getAllByType(ScrollView)[0]).backgroundColor).toBe('#FFFFFF');
    expect(corDe(getByText('OLÁ DE NOVO'))).toBe('#163300');
  });
});

describe('SignUp', () => {
  it.each(TEMAS)('%s: fundo, titulo e link seguem o tema', (tema) => {
    const { getByText, UNSAFE_getAllByType } = renderNoTema(tema, <SignUp />);
    expect(estilo(UNSAFE_getAllByType(ScrollView)[0]).backgroundColor).toBe(cor(tema).background);
    expect(corDe(getByText('CRIAR CONTA'))).toBe(cor(tema).textPrimary);
    expect(corDe(getByText('Entrar'))).toBe(cor(tema).textPrimary);
  });

  it.each(TEMAS)('%s: o aviso da fila e textPrimary sobre o surfaceAlt, com o icone do mesmo tom', (tema) => {
    mockParams = { professionalId: 'p1', professionalName: 'Carlos' };
    const { getByText, getByTestId } = renderNoTema(tema, <SignUp />);
    const aviso = getByText('ENTRANDO NA FILA · CARLOS');
    expect(corDe(aviso)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(aviso)).toBe(cor(tema).surfaceAlt);
    expect(razao(corDe(aviso)!, cor(tema).surfaceAlt)).toBeGreaterThanOrEqual(4.5);
    expect(getByTestId('icone-TriangleAlert').props.cor).toBe(cor(tema).textPrimary);
    expect(corDe(getByText('NÃO PERCA SUA VEZ'))).toBe(cor(tema).textPrimary);
  });

  it.each(TEMAS)('%s: senhas que conferem usam textPrimary; as que nao, o danger do tema', (tema) => {
    const { getByPlaceholderText, getByText, getByTestId } = renderNoTema(tema, <SignUp />);
    fireEvent.changeText(getByPlaceholderText('Crie uma senha'), 'Senha@123');
    fireEvent.changeText(getByPlaceholderText('Confirmar senha'), 'Senha@123');
    expect(corDe(getByText('Senhas conferem'))).toBe(cor(tema).textPrimary);
    expect(getByTestId('icone-Check').props.cor).toBe(cor(tema).textPrimary);

    fireEvent.changeText(getByPlaceholderText('Confirmar senha'), 'outra');
    expect(corDe(getByText('Senhas não conferem'))).toBe(cor(tema).danger);
    expect(getByTestId('icone-X').props.cor).toBe(cor(tema).danger);
    expect(razao(cor(tema).danger, cor(tema).background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('ForgotPassword', () => {
  it.each(TEMAS)('%s: o titulo e textPrimary', (tema) => {
    const { getByText } = renderNoTema(tema, <ForgotPassword />);
    expect(corDe(getByText('ESQUECEU A SENHA?'))).toBe(cor(tema).textPrimary);
  });

  it.each(TEMAS)('%s: no passo do codigo o titulo e o "Reenviar" seguem o tema', async (tema) => {
    const { getByPlaceholderText, getByTestId, findByText, getByText } = renderNoTema(tema, <ForgotPassword />);
    fireEvent.changeText(getByPlaceholderText('E-mail'), 'cliente@vupth.com');
    await act(async () => {
      fireEvent.press(getByTestId('forgot-send'));
    });
    await findByText('NOVA SENHA');
    expect(corDe(getByText('NOVA SENHA'))).toBe(cor(tema).textPrimary);
    expect(corDe(getByText('Reenviar código'))).toBe(cor(tema).textPrimary);
    expect(razao(corDe(getByText('Reenviar código'))!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('CompleteProfile', () => {
  it.each(TEMAS)('%s: o selo "Conta criada" usa o par do greenTint e o titulo e textPrimary', (tema) => {
    const { getByText, getByTestId } = renderNoTema(tema, <CompleteProfile />);
    const selo = getByText('CONTA CRIADA');
    expect(corDe(selo)).toBe(cor(tema).onGreenTint);
    expect(fundoSobre(selo)).toBe(cor(tema).greenTint);
    expect(razao(corDe(selo)!, cor(tema).greenTint)).toBeGreaterThanOrEqual(4.5);
    expect(getByTestId('icone-UserRound').props.cor).toBe(cor(tema).onGreenTint);
    expect(corDe(getByText('QUASE LÁ'))).toBe(cor(tema).textPrimary);
  });
});

afterAll(voltarAoClaro);
