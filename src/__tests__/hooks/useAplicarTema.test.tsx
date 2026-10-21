import { Appearance, Platform } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { esquemaDoSistema, espelharNaWeb, pedirEsquemaAoSistema, useAplicarTema } from '@hooks/useAplicarTema';
import { useTemaStore } from '@stores/temaStore';
import { temaDeNavegacao } from '@utils/temaDeNavegacao';
import { coresDoTema } from '@domain/tema';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));
let mockLiberado = true;
jest.mock('@theme/liberacao', () => ({
  get ESCURO_LIBERADO() {
    return mockLiberado;
  },
}));

describe('esquemaDoSistema / pedirEsquemaAoSistema', () => {
  afterEach(() => jest.restoreAllMocks());

  it('claro e escuro fixam; automatico devolve ao aparelho (null)', () => {
    expect(esquemaDoSistema('claro')).toBe('light');
    expect(esquemaDoSistema('escuro')).toBe('dark');
    expect(esquemaDoSistema('automatico')).toBeNull();
  });

  it('pede ao sistema o esquema da preferencia; aparelho que recusa nao derruba o app', () => {
    const pedir = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
    pedirEsquemaAoSistema('escuro');
    expect(pedir).toHaveBeenCalledWith('dark');
    pedirEsquemaAoSistema('automatico');
    expect(pedir).toHaveBeenLastCalledWith(null);
    pedir.mockImplementation(() => {
      throw new Error('recusado');
    });
    expect(() => pedirEsquemaAoSistema('claro')).not.toThrow();
  });

  it('onde nao existe setColorScheme (web) nao faz nada', () => {
    const original = Appearance.setColorScheme;
    // @ts-expect-error simula o react-native-web, que nao tem o metodo
    Appearance.setColorScheme = undefined;
    try {
      expect(() => pedirEsquemaAoSistema('escuro')).not.toThrow();
    } finally {
      Appearance.setColorScheme = original;
    }
  });
});

describe('espelharNaWeb', () => {
  function raizFalsa() {
    const props: Record<string, string> = {};
    const attrs: Record<string, string> = {};
    const raiz = {
      style: { setProperty: (k: string, v: string) => (props[k] = v) },
      setAttribute: (k: string, v: string) => (attrs[k] = v),
      removeAttribute: (k: string) => delete attrs[k],
    } as unknown as HTMLElement;
    return { props, attrs, raiz };
  }

  it('escuro: o <html> ganha o atributo do tema (o portal do Modal herda), o color-scheme e o fundo', () => {
    const { props, attrs, raiz } = raizFalsa();
    espelharNaWeb('escuro', '#0B1A04', raiz);
    expect(attrs['data-theme-id']).toBe('escuro');
    expect(props['color-scheme']).toBe('dark');
    expect(props['background-color']).toBe('#0B1A04');
  });

  it('voltar ao claro tira o atributo', () => {
    const { props, attrs, raiz } = raizFalsa();
    espelharNaWeb('escuro', '#0B1A04', raiz);
    espelharNaWeb('claro', '#FFFFFF', raiz);
    expect(attrs['data-theme-id']).toBeUndefined();
    expect(props['color-scheme']).toBe('light');
    expect(props['background-color']).toBe('#FFFFFF');
  });

  it('sem <html> (nativo, jest) e um no-op', () => {
    expect(() => espelharNaWeb('claro', '#FFFFFF', undefined)).not.toThrow();
  });
});

describe('useAplicarTema', () => {
  const plataforma = Platform.OS;
  beforeEach(() => {
    jest.restoreAllMocks();
    mockLiberado = true;
    useTemaStore.setState({ preferencia: 'escuro' });
  });
  afterEach(() => {
    Platform.OS = plataforma;
  });

  it('leva a preferencia ao sistema', () => {
    const pedir = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
    renderHook(() => useAplicarTema());
    expect(pedir).toHaveBeenCalledWith('dark');
  });

  it('sem a liberacao do escuro nao toca no sistema: o app fica como era', () => {
    mockLiberado = false;
    const pedir = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
    renderHook(() => useAplicarTema());
    expect(pedir).not.toHaveBeenCalled();
  });
});

describe('temaDeNavegacao', () => {
  it('no CLARO e exatamente o tema de antes (o padrao do React Navigation + o fundo da marca)', () => {
    const antes = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#FFFFFF' } };
    expect(temaDeNavegacao(false, coresDoTema('claro'))).toEqual(antes);
  });

  it('no escuro parte do DarkTheme e pinta fundo, cartao, texto e borda com os tokens', () => {
    const cores = coresDoTema('escuro');
    expect(temaDeNavegacao(true, cores).colors).toMatchObject({
      background: cores.background,
      card: cores.surface,
      text: cores.textPrimary,
      border: cores.border,
      primary: DarkTheme.colors.primary,
    });
  });
});
