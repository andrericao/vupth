import { commitDoApp, rotuloDaVersao } from '@domain/versao';

// Andre, 26/09: o visitante vê a versão e a data, sem o menu nem os 7 toques.

describe('o rótulo da versão', () => {
  it('versão e data do OTA', () => {
    expect(rotuloDaVersao('1.0.2', new Date(2026, 8, 26, 14, 30))).toBe('Versão 1.0.2 · 26/09/2026');
  });

  it('bundle embutido (sem OTA): só a versão', () => {
    expect(rotuloDaVersao('1.0.2', null)).toBe('Versão 1.0.2');
    expect(rotuloDaVersao('1.0.2')).toBe('Versão 1.0.2');
  });

  it('sem versão (modo dev) ou data inválida não imprime lixo', () => {
    expect(rotuloDaVersao(null, new Date('x'))).toBe('Versão —');
    expect(rotuloDaVersao(undefined)).toBe('Versão —');
  });
});

describe('o commit do app (a bateria confere a versão, 03/10)', () => {
  it('entra no fim do rótulo', () => {
    expect(rotuloDaVersao('1.0.3', new Date(2026, 9, 3), 'c65338e7')).toBe('Versão 1.0.3 · 03/10/2026 · c65338e7');
    expect(rotuloDaVersao('1.0.3', null, 'c65338e7')).toBe('Versão 1.0.3 · c65338e7');
    expect(rotuloDaVersao('1.0.3', null, null)).toBe('Versão 1.0.3');
  });

  it('lê o extra.commit e corta em 8, minúsculo', () => {
    expect(commitDoApp({ commit: 'C65338E7AB12CD34EF56AB78CD90EF12AB34CD56' })).toBe('c65338e7');
    expect(commitDoApp({ commit: ' c65338e ' })).toBe('c65338e');
  });

  it('sem commit válido: null', () => {
    expect(commitDoApp(undefined)).toBeNull();
    expect(commitDoApp(null)).toBeNull();
    expect(commitDoApp({})).toBeNull();
    expect(commitDoApp({ commit: 42 })).toBeNull();
    expect(commitDoApp({ commit: 'desconhecido' })).toBeNull();
    expect(commitDoApp({ commit: 'abc' })).toBeNull();
  });
});
