import { act, render, renderHook } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { GluestackUIProvider, Box } from '@gluestack-ui/themed';

import * as SecureStore from 'expo-secure-store';
import { useTema } from '@hooks/useTema';
import { TemaDoApp, useBarraDeStatus } from '@components/TemaDoApp';
import { useTemaStore } from '@stores/temaStore';
import { coresDoTema, veuDoTema } from '@domain/tema';
import { config } from '../../../config/gluestack-ui.config';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

// O aparelho: o teste escolhe se ele esta no claro ou no escuro.
let mockSistema: 'light' | 'dark' | null = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockSistema,
}));
// A liberacao do escuro (src/theme/liberacao.ts), lida a cada uso.
let mockLiberado = true;
jest.mock('@theme/liberacao', () => ({
  get ESCURO_LIBERADO() {
    return mockLiberado;
  },
}));

function ler() {
  const { result, unmount } = renderHook(() => useTema());
  const valor = result.current;
  unmount();
  return valor;
}

describe('useTema', () => {
  beforeEach(() => {
    mockSistema = 'light';
    mockLiberado = true;
    useTemaStore.setState({ preferencia: 'claro' });
  });

  it('no CLARO (o padrao) entrega os hex de hoje e o veu claro', () => {
    const tema = ler();
    expect(tema).toMatchObject({ tema: 'claro', escuro: false, preferencia: 'claro' });
    expect(tema.cores).toBe(coresDoTema('claro'));
    expect(tema.cores.surface).toBe('#F3F5F1');
    expect(tema.cores.textPrimary).toBe('#163300');
    expect(tema.veu).toBe(veuDoTema('claro'));
  });

  it('no ESCURO a cor de cada nome e o par escuro: surface vira o forest, texto fica claro', () => {
    useTemaStore.setState({ preferencia: 'escuro' });
    const tema = ler();
    expect(tema).toMatchObject({ tema: 'escuro', escuro: true, preferencia: 'escuro' });
    expect(tema.cores).toMatchObject({ background: '#0B1A04', surface: '#163300', textPrimary: '#F3F5F1', painel: '#163300' });
    expect(tema.veu).toBe('rgba(0,0,0,.55)');
  });

  it('o botao primario e igual nos dois temas', () => {
    const claro = ler();
    useTemaStore.setState({ preferencia: 'escuro' });
    const escuro = ler();
    expect(escuro.cores.green).toBe(claro.cores.green);
    expect(escuro.cores.onGreen).toBe(claro.cores.onGreen);
  });

  it('automatico segue o aparelho; claro e escuro o ignoram', () => {
    useTemaStore.setState({ preferencia: 'automatico' });
    mockSistema = 'dark';
    expect(ler().tema).toBe('escuro');
    mockSistema = 'light';
    expect(ler().tema).toBe('claro');
    mockSistema = null;
    expect(ler().tema).toBe('claro');
    useTemaStore.setState({ preferencia: 'claro' });
    mockSistema = 'dark';
    expect(ler().tema).toBe('claro');
    useTemaStore.setState({ preferencia: 'escuro' });
    mockSistema = 'light';
    expect(ler().tema).toBe('escuro');
  });

  it('redesenha quando a escolha muda e devolve o mesmo objeto enquanto nada muda', () => {
    const { result, rerender } = renderHook(() => useTema());
    const primeiro = result.current;
    rerender({});
    expect(result.current).toBe(primeiro);
    act(() => useTemaStore.setState({ preferencia: 'escuro' }));
    expect(result.current.tema).toBe('escuro');
    expect(result.current).not.toBe(primeiro);
  });

  it('com o escuro NAO liberado, o que estiver guardado nao vale (nunca fica preso no escuro)', () => {
    mockLiberado = false;
    useTemaStore.setState({ preferencia: 'escuro' });
    expect(ler()).toMatchObject({ tema: 'claro', preferencia: 'claro' });
    mockSistema = 'dark';
    useTemaStore.setState({ preferencia: 'automatico' });
    expect(ler().tema).toBe('claro');
  });
});

describe('TemaDoApp', () => {
  const cor = (getByTestId: (id: string) => { props: { style?: StyleProp<ViewStyle> } }) =>
    StyleSheet.flatten(getByTestId('caixa').props.style)?.backgroundColor;

  beforeEach(() => {
    mockSistema = 'light';
    mockLiberado = true;
    useTemaStore.setState({ preferencia: 'claro' });
  });

  it('o tema escolhido chega aos tokens do Gluestack, sem remontar a arvore', () => {
    const { getByTestId } = render(
      <GluestackUIProvider config={config}>
        <TemaDoApp>
          <Box testID="caixa" bg="$brandSurface" />
        </TemaDoApp>
      </GluestackUIProvider>,
    );
    const no = getByTestId('caixa');
    expect(cor(getByTestId)).toBe('#F3F5F1');
    act(() => useTemaStore.setState({ preferencia: 'escuro' }));
    expect(cor(getByTestId)).toBe('#163300');
    expect(getByTestId('caixa')).toBe(no);
    act(() => useTemaStore.setState({ preferencia: 'claro' }));
    expect(cor(getByTestId)).toBe('#F3F5F1');
  });

  it('com o escuro NAO liberado, o app fica claro mesmo com o escuro guardado', () => {
    mockLiberado = false;
    useTemaStore.setState({ preferencia: 'escuro' });
    const { getByTestId } = render(
      <GluestackUIProvider config={config}>
        <TemaDoApp>
          <Box testID="caixa" bg="$brandSurface" />
        </TemaDoApp>
      </GluestackUIProvider>,
    );
    expect(cor(getByTestId)).toBe('#F3F5F1');
  });

  it('le a escolha guardada no aparelho ao montar (uma vez) e o app passa ao escuro', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('escuro');
    const { getByTestId } = render(
      <GluestackUIProvider config={config}>
        <TemaDoApp>
          <Box testID="caixa" bg="$brandSurface" />
        </TemaDoApp>
      </GluestackUIProvider>,
    );
    expect(cor(getByTestId)).toBe('#F3F5F1');
    await act(async () => {});
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('vupth_tema');
    expect(cor(getByTestId)).toBe('#163300');
  });
});

describe('useBarraDeStatus', () => {
  beforeEach(() => {
    mockSistema = 'light';
    mockLiberado = true;
  });

  it('icones escuros sobre o branco no claro; claros sobre o fundo escuro no escuro', () => {
    useTemaStore.setState({ preferencia: 'claro' });
    const claro = renderHook(() => useBarraDeStatus());
    expect(claro.result.current).toEqual({ style: 'dark', fundo: '#FFFFFF' });
    claro.unmount();
    useTemaStore.setState({ preferencia: 'escuro' });
    const escuro = renderHook(() => useBarraDeStatus());
    expect(escuro.result.current).toEqual({ style: 'light', fundo: '#0B1A04' });
    escuro.unmount();
  });
});
