import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Input2 } from '@components/Input2';

// cobertura-98: o olho da senha e o "limpar" da busca.

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return new Proxy({}, { get: (_t, nome) => () => createElement(View, { testID: `icone-${String(nome)}` }) });
});

describe('Input2', () => {
  it('senha: nasce escondida e o olho alterna', () => {
    const { getByTestId, getByPlaceholderText } = renderWithProviders(
      <Input2 placeholder="Senha" isPassword />,
    );
    expect(getByPlaceholderText('Senha').props.secureTextEntry).toBe(true);
    expect(getByTestId('input-ver-senha').props.accessibilityLabel).toBe('Mostrar a senha');
    fireEvent.press(getByTestId('input-ver-senha'));
    expect(getByPlaceholderText('Senha').props.secureTextEntry).toBe(false);
    expect(getByTestId('input-ver-senha').props.accessibilityLabel).toBe('Esconder a senha');
  });

  it('fora da senha, vale o secureTextEntry de quem chama', () => {
    const { getByPlaceholderText, queryByTestId } = renderWithProviders(
      <Input2 placeholder="Campo" secureTextEntry />,
    );
    expect(getByPlaceholderText('Campo').props.secureTextEntry).toBe(true);
    expect(queryByTestId('input-ver-senha')).toBeNull();
  });

  it('busca vazia: a lupa, sem o limpar', () => {
    const { queryByTestId, getByTestId } = renderWithProviders(
      <Input2 placeholder="Buscar" showSearchIcon value="" onClear={jest.fn()} />,
    );
    expect(getByTestId('icone-Search')).toBeTruthy();
    expect(queryByTestId('input-limpar')).toBeNull();
  });

  it('busca com texto: o limpar chama o onClear', () => {
    const onClear = jest.fn();
    const { getByTestId, queryByTestId } = renderWithProviders(
      <Input2 placeholder="Buscar" showSearchIcon value="corte" onClear={onClear} />,
    );
    expect(queryByTestId('icone-Search')).toBeNull();
    fireEvent.press(getByTestId('input-limpar'));
    expect(onClear).toHaveBeenCalled();
  });

  it('busca com texto e sem onClear: nem lupa nem limpar', () => {
    const { queryByTestId } = renderWithProviders(
      <Input2 placeholder="Buscar" showSearchIcon value="corte" />,
    );
    expect(queryByTestId('icone-Search')).toBeNull();
    expect(queryByTestId('input-limpar')).toBeNull();
  });
});
