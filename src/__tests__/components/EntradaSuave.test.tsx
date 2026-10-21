import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, StyleSheet, Text, ViewStyle } from 'react-native';

import { EntradaSuave } from '@components/EntradaSuave';
import { OfflineBanner } from '@components/OfflineBanner';
import { useIsOnline } from '@hooks/useNetwork';

jest.mock('@hooks/useNetwork', () => ({ useIsOnline: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

const esvaziar = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const estiloDa = (json: unknown) => StyleSheet.flatten((json as { props: { style: unknown } }).props.style as ViewStyle);

describe('EntradaSuave', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('o que chega entra com fade e deslize de 12 pontos em 450 ms', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const { getByText } = render(
      <EntradaSuave dy={12}>
        <Text>Falta 1 passo</Text>
      </EntradaSuave>
    );
    expect(getByText('Falta 1 passo')).toBeTruthy();
    await esvaziar();
    // Só transform e opacity, no driver nativo: é o que mantém a lista fluida.
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1, duration: 450, delay: 0, useNativeDriver: true })
    );
  });

  it('com movimento reduzido já nasce no lugar', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { toJSON } = render(
      <EntradaSuave>
        <Text>x</Text>
      </EntradaSuave>
    );
    await esvaziar();
    expect(estiloDa(toJSON()).opacity).toBe(1);
  });

  it('o atraso escalona a lista e desmontar antes não quebra', async () => {
    const { unmount } = render(
      <EntradaSuave atraso={150}>
        <Text>x</Text>
      </EntradaSuave>
    );
    await esvaziar();
    expect(() => unmount()).not.toThrow();
  });
});

describe('OfflineBanner', () => {
  afterEach(() => jest.restoreAllMocks());

  it('online: nada na tela', () => {
    (useIsOnline as jest.Mock).mockReturnValue(true);
    const { toJSON } = render(<OfflineBanner />);
    expect(toJSON()).toBeNull();
  });

  it('offline: a barra aparece no topo e entra deslizando de cima', async () => {
    jest.useFakeTimers();
    (useIsOnline as jest.Mock).mockReturnValue(false);
    const { getByText, toJSON } = render(<OfflineBanner />);
    expect(getByText(/Sem conexão/)).toBeTruthy();
    await esvaziar();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(600);
    });
    const estilo = estiloDa(toJSON());
    expect(estilo.position).toBe('absolute');
    expect(estilo.paddingTop).toBe(24);
    expect(estilo.opacity).toBe(1);
    jest.useRealTimers();
  });
});
