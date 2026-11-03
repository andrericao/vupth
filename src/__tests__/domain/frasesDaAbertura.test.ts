import AsyncStorage from '@react-native-async-storage/async-storage';

import { FRASES_DA_ABERTURA, fraseDaAbertura, sortearFraseDaAbertura } from '@domain/frasesDaAbertura';

describe('frasesDaAbertura', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('a primeira frase é a de teste e todas são curtas', () => {
    expect(FRASES_DA_ABERTURA[0]).toMatch(/teste/i);
    FRASES_DA_ABERTURA.forEach((f) => expect(f.length).toBeLessThanOrEqual(70));
  });

  it('gira pela lista e dá a volta, inclusive com índice negativo', () => {
    const n = FRASES_DA_ABERTURA.length;
    expect(fraseDaAbertura(n)).toBe(FRASES_DA_ABERTURA[0]);
    expect(fraseDaAbertura(-1)).toBe(FRASES_DA_ABERTURA[n - 1]);
  });

  it('cada abertura mostra a frase seguinte', async () => {
    expect(await sortearFraseDaAbertura()).toBe(FRASES_DA_ABERTURA[0]);
    expect(await sortearFraseDaAbertura()).toBe(FRASES_DA_ABERTURA[1]);
  });

  it('valor salvo estragado ou armazenamento quebrado cai na primeira frase, sem rejeitar', async () => {
    await AsyncStorage.setItem('vupth:abertura:frase', 'xyz');
    expect(await sortearFraseDaAbertura()).toBe(FRASES_DA_ABERTURA[0]);
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('x'));
    expect(await sortearFraseDaAbertura()).toBe(FRASES_DA_ABERTURA[0]);
  });
});
