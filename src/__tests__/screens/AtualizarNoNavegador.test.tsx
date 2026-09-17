import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { AtualizarNoNavegador } from '@components/AtualizarNoNavegador';

// Puxar para atualizar não existe no navegador (teste de 08/09): lá o gatilho
// vira um botão visível. No app, nada aparece — o gesto continua valendo.

let mockNoNavegador = false;
jest.mock('@utils/ehNavegador', () => ({ ehNavegador: () => mockNoNavegador }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

describe('AtualizarNoNavegador', () => {
  it('no app, não aparece', () => {
    mockNoNavegador = false;
    const { queryByTestId } = renderWithProviders(<AtualizarNoNavegador atualizando={false} onPress={jest.fn()} />);
    expect(queryByTestId('web-refresh')).toBeNull();
  });

  it('no navegador, aparece e atualiza ao tocar', () => {
    mockNoNavegador = true;
    const onPress = jest.fn();
    const { getByTestId, getByText } = renderWithProviders(<AtualizarNoNavegador atualizando={false} onPress={onPress} />);
    expect(getByText('Atualizar')).toBeTruthy();
    fireEvent.press(getByTestId('web-refresh'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('enquanto atualiza, avisa e não dispara de novo', () => {
    mockNoNavegador = true;
    const onPress = jest.fn();
    const { getByTestId, getByText } = renderWithProviders(<AtualizarNoNavegador atualizando onPress={onPress} />);
    expect(getByText('Atualizando...')).toBeTruthy();
    fireEvent.press(getByTestId('web-refresh'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
