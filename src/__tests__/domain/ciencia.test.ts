import { avisoDeAtraso, precisaAvisarAtraso } from '../../domain/queue/ciencia';

// "Não podemos agir na surdina" (Andre, 18/09): o cliente nunca é multado nem
// marcado como atrasado sem ter TOCADO num aviso. E o atraso avisa mesmo SEM
// multa, porque é a contagem que torna a terceira vez justa.

describe('avisoDeAtraso', () => {
  // GUIA_DE_TEXTO.md §4.3: o título diz o fato; o corpo é uma linha; o resto
  // (a regra completa dos 3 atrasos) mora no "Saiba mais".
  it('1º atraso: o título diz que trocou de lugar, e o corpo diz o que vem no 3º', () => {
    const a = avisoDeAtraso({ contagem: 1 });
    expect(a.titulo).toBe('Você trocou de lugar');
    expect(a.mensagem).toBe('1º atraso, sem multa. No 3º, R$ 5,00 e fim da fila.');
    expect(a.botao).toBe('Entendi');
  });

  it('2º atraso: o mesmo texto com o ordinal do servidor', () => {
    expect(avisoDeAtraso({ contagem: 2 }).mensagem).toBe('2º atraso, sem multa. No 3º, R$ 5,00 e fim da fila.');
  });

  it('3º atraso: o título é o ordinal e o corpo diz a multa e o fim da fila', () => {
    const a = avisoDeAtraso({ contagem: 3 });
    expect(a.titulo).toBe('3º atraso');
    expect(a.mensagem).toBe('Multa de R$ 5,00 e você foi para o fim da fila.');
    expect(a.botao).toBe('Entendi');
  });

  it('o backend manda quem decide: `multa` vence a contagem', () => {
    expect(avisoDeAtraso({ contagem: 1, multa: true }).mensagem).toMatch(/^Multa de R\$ 5,00/);
    expect(avisoDeAtraso({ contagem: 5, multa: false }).mensagem).toMatch(/sem multa/);
  });

  it('multa sem contagem: é o 3º por regra, com o valor e o fim da fila', () => {
    const a = avisoDeAtraso({ multa: true });
    expect(a.titulo).toBe('3º atraso');
    expect(a.mensagem).toBe('Multa de R$ 5,00 e você foi para o fim da fila.');
  });

  // Andre, 26/09 (esboço): desde o 1º atraso, a opção de adiar.
  it('antes da multa oferece adiar; no 3º, não', () => {
    for (const s of [{}, { contagem: 1 }, { contagem: 2 }]) {
      const a = avisoDeAtraso(s);
      expect(a.titulo).toBe('Você trocou de lugar');
      expect(a.oferecerAdiar).toBe(true);
    }
    expect(avisoDeAtraso({ contagem: 3 }).oferecerAdiar).toBe(false);
  });

  it('SEM a contagem (o backend ainda não manda), não inventa ordinal', () => {
    const a = avisoDeAtraso({});
    expect(a.mensagem).not.toMatch(/\dº atraso, sem/);
    expect(a.mensagem).toBe('Sem multa por enquanto. No 3º atraso, R$ 5,00 e fim da fila.');
  });

  it('segue as medidas do guia: título de até 4 palavras, corpo de até 70 caracteres', () => {
    for (const s of [{}, { contagem: 1 }, { contagem: 2 }, { contagem: 3 }]) {
      const a = avisoDeAtraso(s);
      expect(a.titulo.split(' ').length).toBeLessThanOrEqual(4);
      expect(a.mensagem.length).toBeLessThanOrEqual(70);
      expect(a.botao.split(' ')).toHaveLength(1);
    }
  });
});

describe('precisaAvisarAtraso', () => {
  it('avisa quando o atendimento está LATE e ninguém tocou ainda', () => {
    expect(precisaAvisarAtraso({ status: 'LATE', attendanceId: 'a1', jaAvisados: [] })).toBe(true);
  });

  it('NÃO repete depois do toque — senão o poll de 30s traz a caixa de volta', () => {
    expect(precisaAvisarAtraso({ status: 'LATE', attendanceId: 'a1', jaAvisados: ['a1'] })).toBe(false);
  });

  it('só o atraso avisa — os outros estados não', () => {
    for (const status of ['SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'CANCELLED']) {
      expect(precisaAvisarAtraso({ status, attendanceId: 'a1', jaAvisados: [] })).toBe(false);
    }
  });

  it('sem atendimento não há o que avisar', () => {
    expect(precisaAvisarAtraso({ status: 'LATE', attendanceId: null, jaAvisados: [] })).toBe(false);
  });
});
