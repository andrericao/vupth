import { act } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { FaixaDaTolerancia } from '@components/FaixaDaTolerancia';

// D13/D15 (Andre, 24/09): enquanto a tolerância vale, uma faixa diz até que
// horas sair é de graça — sem preço. Só com o horário vindo do servidor.

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

describe('FaixaDaTolerancia', () => {
  afterEach(() => jest.useRealTimers());

  it('sem horário do servidor, não aparece — o app não inventa janela', () => {
    const { queryByTestId } = renderWithProviders(<FaixaDaTolerancia ate={null} />);
    expect(queryByTestId('faixa-da-tolerancia')).toBeNull();
  });

  it('dentro da tolerância: diz até que horas, e nenhum preço', () => {
    const ate = new Date(2026, 8, 26, 14, 35).getTime();
    jest.useFakeTimers({ now: new Date(2026, 8, 26, 14, 30) });
    const { getByText, queryByText } = renderWithProviders(<FaixaDaTolerancia ate={ate} />);
    expect(getByText(/sem custo até 14:35/)).toBeTruthy();
    expect(queryByText(/R\$/)).toBeNull();
  });

  it('some sozinha quando o horário passa', () => {
    jest.useFakeTimers({ now: new Date(2026, 8, 26, 14, 30) });
    const ate = Date.now() + 5 * 60000;
    const { queryByTestId } = renderWithProviders(<FaixaDaTolerancia ate={ate} />);
    expect(queryByTestId('faixa-da-tolerancia')).toBeTruthy();
    act(() => jest.advanceTimersByTime(5 * 60000 + 1));
    expect(queryByTestId('faixa-da-tolerancia')).toBeNull();
  });

  it('horário já vencido não aparece', () => {
    const { queryByTestId } = renderWithProviders(<FaixaDaTolerancia ate={Date.now() - 1000} />);
    expect(queryByTestId('faixa-da-tolerancia')).toBeNull();
  });
});
