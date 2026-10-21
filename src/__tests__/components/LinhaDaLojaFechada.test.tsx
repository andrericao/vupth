import { StyleSheet } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { LinhaDaLojaFechada } from '@components/LinhaDaLojaFechada';
import { Establishment } from '@domain/establishment/types';

// loja-fechada (Design, 17/10): na lista de uma categoria a loja fechada entra no
// fim com o selo AGENDAR (o ambar do tema, brandWarning) e a linha sem apagar.

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.setTimeout(60000);

const fechada = {
  id: 'e2',
  name: 'Studio Ana',
  urlImage: null,
  serviceType: 'BARBER',
  open_status: 'CLOSED',
  is_open: false,
  distance_km: 1.2,
} as unknown as Establishment;

type No = { props?: Record<string, unknown>; children?: (No | string)[] | null };

// Os estilos de todos os Views/Texts renderizados (o Gluestack os resolve depois
// da primeira pintura, entao quem le precisa esperar o fundo da linha aparecer).
function estilosRenderizados(no: No | string | null): Record<string, unknown>[] {
  if (!no || typeof no === 'string') return [];
  const proprio = no.props?.style ? [StyleSheet.flatten(no.props.style as never) as Record<string, unknown>] : [];
  return proprio.concat(...(no.children ?? []).map((f) => estilosRenderizados(f)));
}

describe('a linha da loja fechada na lista da categoria', () => {
  it('mostra o selo AGENDAR e o toque abre a loja', async () => {
    const onPress = jest.fn();
    const { getByTestId, getByText } = renderWithProviders(<LinhaDaLojaFechada establishment={fechada} onPress={onPress} />);
    // O Gluestack resolve o estilo depois da primeira pintura.
    await waitFor(() => expect(StyleSheet.flatten(getByTestId('agendar-e2').props.style).backgroundColor).toBe('#FFC091'), {
      timeout: 15000,
    });
    expect(getByText('AGENDAR')).toBeTruthy();
    fireEvent.press(getByTestId('establishment-e2'));
    expect(onPress).toHaveBeenCalled();
  });

  it('a linha não é apagada: sem opacity em bloco nenhum e nome em forest', async () => {
    const { getByText, toJSON } = renderWithProviders(<LinhaDaLojaFechada establishment={fechada} onPress={jest.fn()} />);
    await waitFor(() => expect(estilosRenderizados(toJSON() as No | null).some((e) => e.backgroundColor === '#F3F5F1')).toBe(true), {
      timeout: 15000,
    });
    expect(estilosRenderizados(toJSON() as No | null).filter((e) => e.opacity != null && e.opacity !== 1)).toEqual([]);
    await waitFor(() => expect(StyleSheet.flatten(getByText('Studio Ana').props.style).color).toBe('#163300'), {
      timeout: 15000,
    });
  });
});
