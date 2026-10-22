import { fireEvent } from '@testing-library/react-native';

import { Settings } from '@screens/Settings';
import { DadosCadastrais } from '@screens/DadosCadastrais';
import { Sistema } from '@screens/Sistema';
import { useComingSoonStore } from '@stores/comingSoonStore';
import { coresDoTema } from '@domain/tema';
import { TEMAS, corDe, fundoSobre, razao, renderNoTema, voltarAoClaro } from '../utils/nosDoisTemas';

// DEC-75: Perfil, Dados cadastrais e Sistema nos dois temas. O erro que isto
// evita: os icones das linhas do menu eram forest fixo sobre o cartao surface (e
// no escuro a surface e o forest: o icone some), o nome do Perfil era branco sobre
// um bloco que precisa seguir forest, e as iniciais do avatar eram `$forest`.

let mockAutenticado = true;

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
jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
  runtimeVersion: '1.0.0',
  channel: 'staging',
  updateId: null,
  createdAt: null,
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), getParent: () => ({ navigate: jest.fn() }) }),
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@services/addressService', () => ({ addressService: { getMain: jest.fn().mockResolvedValue({ data: null }) } }));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({
      user: { first_name: 'Alexia', last_name: 'Souza', email: 'a@b.com' },
      accessToken: mockAutenticado ? 'tk' : null,
      isAuthenticated: mockAutenticado,
      logout: jest.fn(),
    }),
}));
// Os modais e os paineis tecnicos sao de outro grupo de telas e componentes.
jest.mock('@components/DeleteAccountModal', () => ({ DeleteAccountModal: () => null }));
jest.mock('@components/WsDiagnostics', () => ({ WsDiagnostics: () => null }));
jest.mock('@components/PushDiagnostics', () => ({ PushDiagnostics: () => null }));
jest.mock('@components/LinksLegais', () => ({ LinksLegais: () => null }));
jest.mock('@components/VersaoDoApp', () => ({ VersaoDoApp: () => null }));

jest.setTimeout(90000);

const cor = (tema: 'claro' | 'escuro') => coresDoTema(tema);

beforeEach(() => {
  mockAutenticado = true;
});

describe('Settings: o bloco da identidade (forest, igual nos dois temas)', () => {
  it.each(TEMAS)('%s: o nome e branco, o e-mail green e as iniciais onGreen sobre o disco verde', (tema) => {
    const { getByText } = renderNoTema(tema, <Settings />);
    const nome = getByText('Alexia Souza');
    expect(corDe(nome)).toBe('#FFFFFF');
    expect(fundoSobre(nome)).toBe('#163300');
    expect(razao('#FFFFFF', '#163300')).toBeGreaterThanOrEqual(4.5);
    expect(corDe(getByText('a@b.com'))).toBe('#9FE870');
    expect(razao('#9FE870', '#163300')).toBeGreaterThanOrEqual(4.5);

    const iniciais = getByText('AS');
    // onGreen sobre green: o par que nao muda de tema
    expect(corDe(iniciais)).toBe('#163300');
    expect(fundoSobre(iniciais)).toBe('#9FE870');
    expect(razao('#163300', '#9FE870')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Settings: o menu e a saida', () => {
  it.each(TEMAS)('%s: os icones das linhas sao textPrimary sobre o cartao surface', (tema) => {
    const { getByTestId } = renderNoTema(tema, <Settings />);
    for (const icone of ['icone-User', 'icone-Palette', 'icone-LifeBuoy', 'icone-Smartphone']) {
      const no = getByTestId(icone);
      expect(no.props.cor).toBe(cor(tema).textPrimary);
      expect(fundoSobre(no)).toBe(cor(tema).surface);
      expect(razao(no.props.cor, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('no claro e o que era: forest', () => {
    const { getByTestId } = renderNoTema('claro', <Settings />);
    expect(getByTestId('icone-User').props.cor).toBe('#163300');
  });

  it.each(TEMAS)('%s: "Sair da conta" e "Excluir conta" sao o danger do tema, legiveis sobre o fundo', (tema) => {
    const { getByText } = renderNoTema(tema, <Settings />);
    for (const texto of ['Sair da conta', 'Excluir conta']) {
      expect(corDe(getByText(texto))).toBe(cor(tema).danger);
      expect(razao(corDe(getByText(texto))!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(TEMAS)('%s: o visitante ve o convite em textSecondary sobre o cartao surface', (tema) => {
    mockAutenticado = false;
    const { getByText } = renderNoTema(tema, <Settings />);
    const convite = getByText(/Você está navegando como visitante/);
    expect(corDe(convite)).toBe(cor(tema).textSecondary);
    expect(fundoSobre(convite)).toBe(cor(tema).surface);
    expect(razao(corDe(convite)!, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('DadosCadastrais', () => {
  it.each(TEMAS)('%s: os quatro icones sao textPrimary sobre o cartao surface', (tema) => {
    const { getByTestId } = renderNoTema(tema, <DadosCadastrais />);
    for (const icone of ['icone-User', 'icone-Mail', 'icone-Lock', 'icone-MapPin']) {
      const no = getByTestId(icone);
      expect(no.props.cor).toBe(cor(tema).textPrimary);
      expect(fundoSobre(no)).toBe(cor(tema).surface);
    }
  });
});

describe('Sistema', () => {
  it.each(TEMAS)('%s: "Verificar atualizacao" e textPrimary sobre a surface, com o icone do mesmo tom', (tema) => {
    const { getByText, getByTestId } = renderNoTema(tema, <Sistema />);
    const rotulo = getByText('Verificar atualização');
    expect(corDe(rotulo)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(rotulo)).toBe(cor(tema).surface);
    expect(razao(corDe(rotulo)!, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);
    expect(getByTestId('icone-RefreshCw').props.cor).toBe(cor(tema).textPrimary);
  });

  it.each(TEMAS)('%s: a contagem do "em breve" usa o par do greenTint', (tema) => {
    useComingSoonStore.setState({ counts: { cupom: 3 } as never });
    const { getByText, getByTestId } = renderNoTema(tema, <Sistema />);
    for (let i = 0; i < 7; i++) fireEvent.press(getByTestId('version-line'));
    const contagem = getByText('3×');
    expect(corDe(contagem)).toBe(cor(tema).onGreenTint);
    expect(fundoSobre(contagem)).toBe(cor(tema).greenTint);
    expect(razao(corDe(contagem)!, cor(tema).greenTint)).toBeGreaterThanOrEqual(4.5);
    useComingSoonStore.setState({ counts: {} as never });
  });
});

afterAll(voltarAoClaro);
