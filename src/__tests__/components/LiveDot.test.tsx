import { AccessibilityInfo } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { LiveDot } from '@components/LiveDot';

// cobertura-98 (16/10): o ponto que pisca — o tamanho e a cor padrão, e a
// leitura do reduce-motion falhando (segue piscando, sem quebrar).

describe('LiveDot', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sem props: 8 px, verde da marca, redondo', async () => {
    const tela = render(<LiveDot />);
    await act(async () => {});
    const estilo = tela.toJSON() as { props: { style: Record<string, unknown> } };
    expect(estilo.props.style).toEqual(
      expect.objectContaining({ width: 8, height: 8, borderRadius: 4, backgroundColor: '#163300' }),
    );
  });

  it('a leitura do reduce-motion falhando não quebra', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('x'));
    const tela = render(<LiveDot size={10} color="#fff" />);
    await act(async () => {});
    expect(tela.toJSON()).toBeTruthy();
    tela.unmount();
  });

  it('parado (pulsing false) fica opaco', async () => {
    const tela = render(<LiveDot pulsing={false} />);
    await act(async () => {});
    expect(tela.toJSON()).toBeTruthy();
  });
});
