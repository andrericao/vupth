import { fireEvent, render } from '@testing-library/react-native';

import { Input2 } from '@components/Input2';

// NativeWind (DEC-5, passo 3): o campo saiu do Gluestack com a mesma API.
describe('Input2 (NativeWind)', () => {
  it('propaga a digitação e repassa foco e saída a quem chama', () => {
    const onChangeText = jest.fn();
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByPlaceholderText } = render(
      <Input2 placeholder="E-mail" onChangeText={onChangeText} onFocus={onFocus} onBlur={onBlur} />,
    );
    const campo = getByPlaceholderText('E-mail');
    fireEvent.changeText(campo, 'a@b.com');
    fireEvent(campo, 'focus');
    fireEvent(campo, 'blur');
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
    expect(onFocus).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
  });

  it('isPassword mascara e o olho alterna a visibilidade', () => {
    const { getByPlaceholderText, getByLabelText } = render(<Input2 placeholder="Senha" isPassword />);
    expect(getByPlaceholderText('Senha').props.secureTextEntry).toBe(true);
    fireEvent.press(getByLabelText('Mostrar senha'));
    expect(getByPlaceholderText('Senha').props.secureTextEntry).toBe(false);
    fireEvent.press(getByLabelText('Ocultar senha'));
    expect(getByPlaceholderText('Senha').props.secureTextEntry).toBe(true);
  });

  it('sem isPassword, respeita o secureTextEntry de quem chama e não mostra o olho', () => {
    const { getByPlaceholderText, queryByLabelText } = render(
      <Input2 placeholder="Código" secureTextEntry />,
    );
    expect(getByPlaceholderText('Código').props.secureTextEntry).toBe(true);
    expect(queryByLabelText('Mostrar senha')).toBeNull();
  });

  it('busca: com texto e onClear, o X limpa; vazio, não há X', () => {
    const onClear = jest.fn();
    const { getByLabelText, queryByLabelText, rerender } = render(
      <Input2 placeholder="Buscar" showSearchIcon value="" onClear={onClear} onChangeText={jest.fn()} />,
    );
    expect(queryByLabelText('Limpar busca')).toBeNull();
    rerender(<Input2 placeholder="Buscar" showSearchIcon value="barba" onClear={onClear} onChangeText={jest.fn()} />);
    fireEvent.press(getByLabelText('Limpar busca'));
    expect(onClear).toHaveBeenCalled();
  });

  it('no nativo não injeta o reset da web; o estilo de quem chama vale', () => {
    const { getByPlaceholderText } = render(<Input2 placeholder="Nome" style={{ fontSize: 20 }} />);
    const estilos = [getByPlaceholderText('Nome').props.style].flat(Infinity).filter(Boolean);
    const final = Object.assign({}, ...estilos);
    expect(final.outlineStyle).toBeUndefined();
    expect(final.fontSize).toBe(20);
  });
});
