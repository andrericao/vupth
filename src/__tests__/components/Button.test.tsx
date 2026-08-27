import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Button } from '@components/Button';

// Regressão real, achada em 2026-08-07 pelo teste do `DeleteAccountModal`:
// o `isDisabled` do Gluestack é só ESTADO VISUAL — deixa o botão apagado, mas o
// toque continua disparando o `onPress`. Todo lugar que passava `isDisabled`
// estava confiando numa proteção que não existia; escaparam os que tinham guarda
// dentro do próprio handler (`if (!canSend) return`).
//
// Estes casos existem para que ninguém precise descobrir isso de novo.

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

describe('Button', () => {
  it('dispara o onPress quando habilitado', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProviders(
      <Button title="Confirmar" testID="btn" onPress={onPress} />,
    );

    fireEvent.press(getByTestId('btn'));

    expect(onPress).toHaveBeenCalled();
  });

  it('NÃO dispara o onPress quando isDisabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProviders(
      <Button title="Confirmar" testID="btn" isDisabled onPress={onPress} />,
    );

    fireEvent.press(getByTestId('btn'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('NÃO dispara o onPress enquanto carrega — evita envio duplicado', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProviders(
      <Button title="Enviando..." testID="btn" isLoading onPress={onPress} />,
    );

    fireEvent.press(getByTestId('btn'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
