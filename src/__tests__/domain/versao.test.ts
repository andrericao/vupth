import { rotuloDaVersao } from '@domain/versao';

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
