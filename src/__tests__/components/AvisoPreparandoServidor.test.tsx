import { act } from '@testing-library/react-native';

import { AvisoPreparandoServidor } from '@components/AvisoPreparandoServidor';
import { esperarServidor, exigirServidor, marcarServidorPronto } from '@services/prontidaoDoServidor';
import { renderWithProviders } from '../utils/renderWithProviders';

// abrir-com-lista-salva (DEC-148): o aviso curto no lugar do erro enquanto o servidor acorda.
describe('AvisoPreparandoServidor', () => {
  afterEach(() => marcarServidorPronto());

  it('sem ninguem esperando: nada', () => {
    const t = renderWithProviders(<AvisoPreparandoServidor />);
    expect(t.queryByTestId('aviso-preparando-servidor')).toBeNull();
  });

  it('com uma gravacao esperando o servidor: "Preparando o servidor…"; some quando ele responde', async () => {
    const t = renderWithProviders(<AvisoPreparandoServidor />);
    exigirServidor();
    let espera!: Promise<void>;
    act(() => {
      espera = esperarServidor();
    });
    expect(t.getByText('Preparando o servidor…')).toBeTruthy();
    await act(async () => {
      marcarServidorPronto();
      await espera;
    });
    expect(t.queryByTestId('aviso-preparando-servidor')).toBeNull();
  });
});
