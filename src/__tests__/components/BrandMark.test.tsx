import { renderWithProviders } from '../utils/renderWithProviders';
import { BrandMark, BRAND_MARK_SIZE } from '@components/BrandMark';
import { Header } from '@components/Header';

// Andre 2026-08-06: "no app quero apenas o V mesmo, veja se consegue criar a
// referência para quando houver mudanças essa seja em apenas um lugar".
// `BrandMark` é essa referência — é o ÚNICO lugar que conhece a arte da marca.
// Os testes abaixo existem para que um `require` avulso de logo em outra tela
// não passe despercebido.

jest.mock('phosphor-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

function styleOf(node: { props: { style?: unknown } }) {
  return Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
}

describe('BrandMark', () => {
  it('usa a MESMA arte que o app.json aponta como ícone nativo', () => {
    const { getByTestId } = renderWithProviders(<BrandMark />);

    // Se alguém apontar o componente para outro arquivo, a arte do app e a do
    // ícone do celular voltam a divergir — que era o problema.
    expect(getByTestId('brand-mark').props.source).toBe(
      require('../../../assets/icon.png'),
    );
  });

  it('cai no tamanho padrão e mantém o arredondamento proporcional', () => {
    const { getByTestId } = renderWithProviders(<BrandMark />);
    const style = styleOf(getByTestId('brand-mark'));

    expect(style.width).toBe(BRAND_MARK_SIZE);
    expect(style.height).toBe(BRAND_MARK_SIZE);
    expect(style.borderRadius).toBeCloseTo(BRAND_MARK_SIZE * 0.24);
  });

  it('redimensiona sem perder a proporção do ladrilho', () => {
    const { getByTestId } = renderWithProviders(<BrandMark size={120} />);
    const style = styleOf(getByTestId('brand-mark'));

    expect(style.width).toBe(120);
    expect(style.borderRadius).toBeCloseTo(120 * 0.24);
  });

  it('é anunciado como VUPTH para leitores de tela', () => {
    const { getByTestId } = renderWithProviders(<BrandMark />);

    expect(getByTestId('brand-mark').props.accessibilityLabel).toBe('VUPTH');
  });
});

describe('Header', () => {
  it('mostra a marca através do BrandMark, sem require próprio', () => {
    const { getByTestId } = renderWithProviders(<Header />);

    expect(getByTestId('brand-mark')).toBeTruthy();
  });
});
