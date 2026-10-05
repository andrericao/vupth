import { mostraPosicao, posicaoVisivel } from '@domain/queue/posicao';

// Fonte única da posição (decisão de 05/09, Backend 35d57c0).

describe('mostraPosicao', () => {
  const lista = [
    { id: 'p1', show_position: true },
    { id: 'p2', show_position: false },
    { id: 'p3' },
    { id: 'p4', show_position: null },
  ];

  it('segue o interruptor do profissional', () => {
    expect(mostraPosicao(lista, 'p1')).toBe(true);
    expect(mostraPosicao(lista, 'p2')).toBe(false);
  });

  it('backend anterior, sem o campo: mostra, como sempre foi', () => {
    expect(mostraPosicao(lista, 'p3')).toBe(true);
    expect(mostraPosicao(lista, 'p4')).toBe(true);
  });

  it('sem saber (lista não chegou, ou ele não está nela): não revela', () => {
    expect(mostraPosicao(undefined, 'p1')).toBe(false);
    expect(mostraPosicao(lista, 'outro')).toBe(false);
    expect(mostraPosicao(lista, undefined)).toBe(false);
  });
});

describe('posicaoVisivel', () => {
  it('liberada, a posição passa; escondida ou sem posição, undefined', () => {
    expect(posicaoVisivel(3, true)).toBe(3);
    expect(posicaoVisivel(3, false)).toBeUndefined();
    expect(posicaoVisivel(undefined, true)).toBeUndefined();
    expect(posicaoVisivel(null, true)).toBeUndefined();
  });
});
