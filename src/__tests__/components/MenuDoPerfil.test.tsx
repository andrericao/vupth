import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { MenuItem } from '@components/MenuDoPerfil';

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.setTimeout(30000);

// dot-ao-lado-do-nome-em-menu-empilhado (André, 24/10): em item de menu com título e subtítulo, o dot
// de aviso fica AO LADO do título (como em Dados do estabelecimento), nunca solto no canto.
describe('MenuItem — dot de aviso', () => {
  it('sem aviso, não há dot', () => {
    const t = renderWithProviders(<MenuItem icon={<Text>i</Text>} label="Dados cadastrais" value="Ana" onPress={jest.fn()} testID="m" />);
    expect(t.queryByTestId('m-aviso')).toBeNull();
  });

  it('com aviso, o dot mora no mesmo bloco do título, ao lado dele', () => {
    const onPress = jest.fn();
    const t = renderWithProviders(<MenuItem icon={<Text>i</Text>} label="Dados cadastrais" value="Ana" onPress={onPress} comAviso testID="m" />);
    const dot = t.getByTestId('m-aviso');
    expect(dot).toBeTruthy();
    // o primeiro ancestral do dot que tem o título é a LINHA do título: ele ainda não tem o subtítulo
    type No = { parent: No | null; findAll: (f: (n: { props?: { children?: unknown } }) => boolean) => unknown[] };
    const tem = (no: No, texto: string) => no.findAll((n) => n.props?.children === texto).length > 0;
    let linha = dot.parent as unknown as No | null;
    while (linha && !tem(linha, 'Dados cadastrais')) linha = linha.parent;
    expect(linha).not.toBeNull();
    expect(tem(linha!, 'Ana')).toBe(false);
    fireEvent.press(t.getByTestId('m'));
    expect(onPress).toHaveBeenCalled();
  });
});
