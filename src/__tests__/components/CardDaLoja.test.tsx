import { StyleSheet } from 'react-native';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { CardDaLoja } from '@components/CardDaLoja';
import { Establishment } from '@domain/establishment/types';

// distancia-e-nota-no-card (Andre, 09/10): "a distancia do estabelecimento e a
// avaliacao devem aparecer no card da home". A nota tinha saido no redesenho
// de 16/08 (7344e150); a distancia so aparece quando o servidor a manda (GPS).

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.setTimeout(90000);

// Os estilos de todos os Views/Texts renderizados (o Gluestack os resolve depois
// da primeira pintura, entao quem le precisa esperar o fundo da linha aparecer).
type No = { props?: Record<string, unknown>; children?: (No | string)[] | null };
function estilosRenderizados(no: No | string | null): Record<string, unknown>[] {
  if (!no || typeof no === 'string') return [];
  const proprio = no.props?.style ? [StyleSheet.flatten(no.props.style as never) as Record<string, unknown>] : [];
  return proprio.concat(...(no.children ?? []).map((f) => estilosRenderizados(f)));
}

function loja(extra: Partial<Establishment> = {}): Establishment {
  return {
    id: 'e1',
    name: 'Barbearia do Zé',
    ownerId: 'o1',
    urlImage: null,
    serviceType: 'BARBER',
    open_status: 'OPEN',
    is_open: true,
    status: 'ACTIVE',
    services: [],
    estimated_wait_minutes: 0,
    ...extra,
  } as Establishment;
}

describe('o card da loja na Home', () => {
  it('mostra a nota (a melhor da loja) e a distância', async () => {
    const { findByText, getByText, getByTestId } = renderWithProviders(
      <CardDaLoja establishment={loja({ rating_best: 4.8, rating_average: 4.2 })} distanceKm={1.25} onPress={jest.fn()} />,
    );
    expect(await findByText('4.8', {}, { timeout: 15000 })).toBeTruthy();
    expect(getByTestId('nota-e1')).toBeTruthy();
    expect(getByText("1,3 km")).toBeTruthy();
  });

  it('loja sem avaliação mostra "Novo", sem estrela nem nota de exemplo (nota-novo)', async () => {
    const { findByText, getByTestId } = renderWithProviders(
      <CardDaLoja establishment={loja({ rating_average: null, rating_count: 0 })} distanceKm={null} onPress={jest.fn()} />,
    );
    expect(await findByText('Novo', {}, { timeout: 15000 })).toBeTruthy();
    expect(within(getByTestId('nota-e1')).queryByText(/^\d\.\d$/)).toBeNull();
  });

  it('sem nota no servidor, usa a média; sem GPS, a distância some e a loja fica', async () => {
    const { findByText, queryByText } = renderWithProviders(
      <CardDaLoja establishment={loja({ rating_average: 4.5 })} distanceKm={null} onPress={jest.fn()} />,
    );
    expect(await findByText('4.5', {}, { timeout: 15000 })).toBeTruthy();
    expect(queryByText(/km/)).toBeNull();
    expect(queryByText('Barbearia do Zé')).toBeTruthy();
  });

  it('a distância vem com o ícone de local (distancia-no-card, 09/10)', async () => {
    const { findByTestId } = renderWithProviders(
      <CardDaLoja establishment={loja()} distanceKm={0.85} onPress={jest.fn()} />,
    );
    const distancia = await findByTestId('distancia-e1', {}, { timeout: 15000 });
    expect(within(distancia).getByText('850 m')).toBeTruthy();
  });

  it('sem GPS no aparelho, "Ligue o GPS" no lugar da distância', async () => {
    const { findByText, getByTestId } = renderWithProviders(
      <CardDaLoja establishment={loja()} distanceKm={null} semGps onPress={jest.fn()} />,
    );
    expect(await findByText('Ligue o GPS', {}, { timeout: 15000 })).toBeTruthy();
    expect(getByTestId('distancia-e1')).toBeTruthy();
  });

  it('com GPS e loja sem coordenada, a distância some (sem o aviso)', async () => {
    const { findByText, queryByTestId, queryByText } = renderWithProviders(
      <CardDaLoja establishment={loja({ rating_average: 4.5 })} distanceKm={null} semGps={false} onPress={jest.fn()} />,
    );
    expect(await findByText('4.5', {}, { timeout: 15000 })).toBeTruthy();
    expect(queryByTestId('distancia-e1')).toBeNull();
    expect(queryByText('Ligue o GPS')).toBeNull();
  });

  it('loja aberta não mostra o selo AGENDAR (agendar-ambar)', async () => {
    const { findByText, queryByText, queryByTestId } = renderWithProviders(
      <CardDaLoja establishment={loja({ estimated_wait_minutes: 0 })} distanceKm={null} onPress={jest.fn()} />,
    );
    expect(await findByText('Sem fila', {}, { timeout: 15000 })).toBeTruthy();
    expect(queryByText('AGENDAR')).toBeNull();
    expect(queryByTestId('status-agendar')).toBeNull();
  });

  it('loja fechada: o selo âmbar AGENDAR; sem tipo, a linha fica só com a nota; o toque abre a loja', async () => {
    const onPress = jest.fn();
    const e = loja({ is_open: false, open_status: 'CLOSED' as Establishment['open_status'], serviceType: undefined });
    const { findByText, getByTestId } = renderWithProviders(
      <CardDaLoja establishment={e} distanceKm={null} destaque="Senta em ~10 min" onPress={onPress} />,
    );
    expect(await findByText('AGENDAR', {}, { timeout: 15000 })).toBeTruthy();
    expect(getByTestId('status-agendar')).toBeTruthy();
    expect(await findByText('Senta em ~10 min')).toBeTruthy();
    fireEvent.press(getByTestId('establishment-e1'));
    expect(onPress).toHaveBeenCalledWith(e);
  });

  it('loja fechada: a linha não é apagada, sem opacity em bloco nenhum e nome na cor normal', async () => {
    const e = loja({ is_open: false, open_status: 'CLOSED' as Establishment['open_status'], rating_average: 4.5 });
    const { findByTestId, getByText, toJSON } = renderWithProviders(
      <CardDaLoja establishment={e} distanceKm={null} onPress={jest.fn()} />,
    );
    await findByTestId('establishment-e1', {}, { timeout: 15000 });
    // Espera o estilo existir (a linha tem fundo surface) antes de afirmar que
    // nao ha opacity: sem isso o teste passaria com o estilo ainda vazio.
    await waitFor(() => expect(estilosRenderizados(toJSON() as No | null).some((x) => x.backgroundColor === '#F3F5F1')).toBe(true), {
      timeout: 15000,
    });
    expect(estilosRenderizados(toJSON() as No | null).filter((x) => x.opacity != null && x.opacity !== 1)).toEqual([]);
    await waitFor(() => expect(StyleSheet.flatten(getByText('Barbearia do Zé').props.style).color).toBe('#163300'), {
      timeout: 15000,
    });
  });
});
