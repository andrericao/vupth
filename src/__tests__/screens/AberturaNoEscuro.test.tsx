import { Onboarding } from '@screens/Onboarding';
import { PushPermission } from '@screens/PushPermission';
import { coresDoTema } from '@domain/tema';
import { TEMAS, corDe, fundoSobre, razao, renderNoTema, voltarAoClaro } from '../utils/nosDoisTemas';

// DEC-75: as duas telas de abertura nos dois temas. O erro que isto evita: o
// titulo e o icone das promessas em forest sobre o fundo da tela (1:1 no escuro) e
// o sino em forest sobre o disco greenTint, que no escuro e um verde bem escuro.

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
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@routes/navigationRef', () => ({ goToLoginAfterOnboarding: jest.fn() }));
jest.mock('@hooks/useEstablishments', () => ({
  useEstablishments: () => ({ data: [{ open_status: 'OPEN', is_open: true }, { open_status: 'OPEN', is_open: true }] }),
}));
jest.mock('@hooks/ofertaDePush', () => ({ recusarAvisoDePush: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@stores/firstRunStore', () => ({
  useFirstRunStore: (sel: (s: unknown) => unknown) =>
    sel({ markOnboardingSeen: jest.fn().mockResolvedValue(undefined), markPushAsked: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('@components/LinksLegais', () => ({ LinksLegais: () => null }));
jest.mock('@components/VersaoDoApp', () => ({ VersaoDoApp: () => null }));

jest.setTimeout(90000);

const cor = (tema: 'claro' | 'escuro') => coresDoTema(tema);

describe('Onboarding', () => {
  it.each(TEMAS)('%s: o titulo e a prova social sao textPrimary sobre o fundo da tela', (tema) => {
    const { getByText, getByTestId } = renderNoTema(tema, <Onboarding />);
    const titulo = getByText('CHEGA DE FILA');
    expect(corDe(titulo)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(titulo)).toBe(cor(tema).background);
    expect(razao(corDe(titulo)!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);
    expect(getByTestId('icone-Users').props.cor).toBe(cor(tema).textPrimary);
  });

  it('no claro e o que era: forest', () => {
    const { getByText, getByTestId } = renderNoTema('claro', <Onboarding />);
    expect(corDe(getByText('CHEGA DE FILA'))).toBe('#163300');
    expect(getByTestId('icone-Users').props.cor).toBe('#163300');
  });
});

describe('PushPermission', () => {
  it.each(TEMAS)('%s: o sino usa o par do greenTint e o titulo e as promessas o do texto', (tema) => {
    const { getByText, getByTestId, getAllByTestId } = renderNoTema(tema, <PushPermission />);
    const sino = getByTestId('icone-BellRing');
    expect(sino.props.cor).toBe(cor(tema).onGreenTint);
    expect(fundoSobre(sino)).toBe(cor(tema).greenTint);
    expect(razao(sino.props.cor, cor(tema).greenTint)).toBeGreaterThanOrEqual(4.5);

    const titulo = getByText('PODE FECHAR O APP');
    expect(corDe(titulo)).toBe(cor(tema).textPrimary);
    expect(razao(corDe(titulo)!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);
    for (const check of getAllByTestId('icone-Check')) expect(check.props.cor).toBe(cor(tema).textPrimary);
  });
});

afterAll(voltarAoClaro);
