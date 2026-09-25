import { fireEvent, render } from '@testing-library/react-native';

import { PilulaVoltarAoTopo } from '@components/PilulaVoltarAoTopo';
import { pilulaVisivel, LIMITE_EM_TELAS, PERTO_DO_TOPO_PX } from '@domain/pilulaDeTopo';

// A pílula "↑ Voltar ao topo" (Andre, 24 e 25/09; desenho do Partner).

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

describe('quando a pílula aparece', () => {
  const tela = 600;
  it('só depois de duas telas de rolagem', () => {
    expect(pilulaVisivel(tela * LIMITE_EM_TELAS - 1, tela)).toBe(false);
    expect(pilulaVisivel(tela * LIMITE_EM_TELAS + 1, tela)).toBe(true);
  });
  it('some perto do topo, e sem altura de tela não aparece', () => {
    expect(pilulaVisivel(PERTO_DO_TOPO_PX - 1, 10)).toBe(false);
    expect(pilulaVisivel(5000, 0)).toBe(false);
  });
});

describe('PilulaVoltarAoTopo', () => {
  it('escondida não recebe toque; visível, o toque volta ao topo', () => {
    const onPress = jest.fn();
    const { getByTestId, rerender } = render(<PilulaVoltarAoTopo visivel={false} onPress={onPress} />);
    // Escondida ela some também do leitor de tela — por isso a busca inclui os ocultos.
    expect(getByTestId('pilula-voltar-ao-topo-caixa', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
    rerender(<PilulaVoltarAoTopo visivel onPress={onPress} />);
    fireEvent.press(getByTestId('pilula-voltar-ao-topo'));
    expect(onPress).toHaveBeenCalled();
  });
});
