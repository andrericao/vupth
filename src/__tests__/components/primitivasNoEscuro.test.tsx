import { act } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Button } from '@components/Button';
import { BrandButton } from '@components/brand/Button';
import { PasswordRules } from '@components/PasswordRules';
import { TemaDoApp } from '@components/TemaDoApp';
import { corDoIconeDoCabecalho } from '@components/ScreenHeader';
import { useTemaStore } from '@stores/temaStore';
import { coresDoTema } from '@domain/tema';

// As primitivas leem o tema: no CLARO cada rotulo e o hex de antes (forest), e no
// ESCURO o par certo — o outline em quase branco (forest sobre forest daria
// 1:1) e o botao primario igual nos dois temas.

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
}));
jest.setTimeout(60000);

const corDe = (no: { props: { style?: StyleProp<TextStyle> } }) => StyleSheet.flatten(no.props.style)?.color;

function rotulo(variant: 'solid' | 'outline' | 'destructive', tema: 'claro' | 'escuro') {
  useTemaStore.setState({ preferencia: tema });
  const { getByText, unmount } = renderWithProviders(
    <TemaDoApp>
      <Button title="Salvar" variant={variant} />
    </TemaDoApp>,
  );
  const cor = corDe(getByText('Salvar'));
  unmount();
  return cor;
}

describe('Button nos dois temas', () => {
  it('solid: o rotulo e o onGreen (forest) nos dois temas — o botao primario nao muda', () => {
    expect(rotulo('solid', 'claro')).toBe('#163300');
    expect(rotulo('solid', 'escuro')).toBe('#163300');
  });

  it('outline: forest no claro, quase branco no escuro (forest sobre a surface daria 1:1)', () => {
    expect(rotulo('outline', 'claro')).toBe('#163300');
    expect(rotulo('outline', 'escuro')).toBe('#F3F5F1');
  });

  it('destructive: o danger do tema', () => {
    expect(rotulo('destructive', 'claro')).toBe('#B3261E');
    expect(rotulo('destructive', 'escuro')).toBe('#FFB4AB');
  });
});

describe('BrandButton nos dois temas', () => {
  function brand(variant: 'primary' | 'secondary' | 'outline' | 'ghost', tema: 'claro' | 'escuro') {
    useTemaStore.setState({ preferencia: tema });
    const { getByText, unmount } = renderWithProviders(
      <TemaDoApp>
        <BrandButton title="Ir" variant={variant} />
      </TemaDoApp>,
    );
    const cor = corDe(getByText('Ir'));
    unmount();
    return cor;
  }

  it('o rotulo de cada variante e o par do fundo, e no claro e o forest de antes', () => {
    for (const v of ['primary', 'secondary', 'outline'] as const) expect(brand(v, 'claro')).toBe('#163300');
    expect(brand('primary', 'escuro')).toBe('#163300'); // onGreen sobre green
    expect(brand('secondary', 'escuro')).toBe('#9FE870'); // onGreenTint sobre o greenTint escuro
    expect(brand('outline', 'escuro')).toBe('#F3F5F1');
  });
});

describe('PasswordRules no escuro', () => {
  it('a regra cumprida deixa de ser forest (sumiria) e vira o texto do tema', () => {
    useTemaStore.setState({ preferencia: 'escuro' });
    const { getByText, unmount } = renderWithProviders(
      <TemaDoApp>
        <PasswordRules rules={[{ label: 'Oito caracteres', passed: true } as never, { label: 'Uma letra', passed: false } as never]} />
      </TemaDoApp>,
    );
    expect(corDe(getByText('Oito caracteres'))).toBe('#F3F5F1');
    expect(corDe(getByText('Uma letra'))).toBe('#FFB4AB');
    unmount();
  });
});

describe('icone do cabecalho', () => {
  it('e o par do fundo do botao redondo: greenTint, foto e hero verde', () => {
    const claro = coresDoTema('claro');
    const escuro = coresDoTema('escuro');
    expect(corDoIconeDoCabecalho(undefined, claro)).toBe('#163300');
    expect(corDoIconeDoCabecalho('claro', escuro)).toBe('#9FE870'); // onGreenTint sobre o greenTint escuro
    // foto e hero verde sao claros nos dois temas: o icone continua forest
    expect(corDoIconeDoCabecalho('foto', escuro)).toBe('#163300');
    expect(corDoIconeDoCabecalho('marca', escuro)).toBe('#163300');
  });
});

afterAll(() => act(() => useTemaStore.setState({ preferencia: 'claro' })));
