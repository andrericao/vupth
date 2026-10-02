import * as SecureStore from 'expo-secure-store';

import { passoValido, rotuloDoPasso, PASSOS_DA_FONTE, varsDaFonte } from '@domain/fonte';
import { useFonteStore, fs } from '@stores/fonteStore';
import { configComFonte, config } from '../../../config/gluestack-ui.config';

// Andre, 26/09: "não é de 10 para 14, mas 10 → 11 → 12 → 13 → 14" — um passo por
// vez, escolhido nas Configurações.

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue('3'),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('o passo da letra', () => {
  it('vai de Normal a +4, um por vez', () => {
    expect([...PASSOS_DA_FONTE]).toEqual([0, 1, 2, 3, 4]);
    expect(PASSOS_DA_FONTE.map(rotuloDoPasso)).toEqual(['Normal', '+1', '+2', '+3', '+4']);
  });

  it('valor salvo estranho volta ao normal', () => {
    expect(passoValido('2')).toBe(2);
    for (const v of [null, undefined, '', 'x', -1, 5, 1.5]) expect(passoValido(v)).toBe(0);
  });
});

describe('o store e o tamanho escrito na tela', () => {
  it('escolher soma o passo em cada tamanho (10 → 12 com +2) e guarda no aparelho', async () => {
    await useFonteStore.getState().escolher(2);
    expect(fs(10)).toBe(12);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('vupth_passo_da_fonte', '2');
  });

  it('restaurar lê o passo salvo', async () => {
    await useFonteStore.getState().restaurar();
    expect(useFonteStore.getState().passo).toBe(3);
    expect(fs(13)).toBe(16);
    await useFonteStore.getState().escolher(0);
  });
});

describe('o tema com a letra maior', () => {
  it('normal devolve o tema de sempre; com passo, os tokens de tamanho sobem junto', () => {
    expect(configComFonte(0)).toBe(config);
    const t = configComFonte(4).tokens as { fontSizes: Record<string, number>; lineHeights: Record<string, number> };
    const base = config.tokens as { fontSizes: Record<string, number>; lineHeights: Record<string, number> };
    expect(t.fontSizes.xs).toBe(base.fontSizes.xs + 4);
    expect(t.lineHeights.sm).toBe(base.lineHeights.sm + 4);
  });
});

// NativeWind (DEC-5): o tailwind.config.js le cada tamanho de uma variavel CSS.
describe('as variaveis da escala para o NativeWind', () => {
  it('no Normal, os valores do arquivo de design — os mesmos do Partner', () => {
    const v = varsDaFonte(0);
    expect(v['--text-sm']).toBe('14px');
    expect(v['--lh-sm']).toBe('20px');
    expect(v['--text-xxxl']).toBe('34px');
    expect(v['--f13']).toBe('13px');
  });

  it('cada passo soma em px no tamanho e na altura de linha', () => {
    const v = varsDaFonte(2);
    expect(v['--text-sm']).toBe('16px');
    expect(v['--lh-sm']).toBe('22px');
    expect(v['--f13']).toBe('15px');
  });

  it('passo estranho volta ao Normal', () => {
    expect(varsDaFonte(9)).toEqual(varsDaFonte(0));
  });
});
