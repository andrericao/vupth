import { avisoDeAtraso, precisaAvisarAtraso } from '../../domain/queue/ciencia';

// "Não podemos agir na surdina" (Andre, 18/09): o cliente nunca é multado nem
// marcado como atrasado sem ter TOCADO num aviso. E o atraso avisa mesmo SEM
// multa, porque é a contagem que torna a terceira vez justa.

describe('avisoDeAtraso', () => {
  it('sem multa, diz qual atraso é e quantos faltam para a multa', () => {
    const a = avisoDeAtraso({ contagem: 1 });
    expect(a.mensagem).toMatch(/1º atraso — sem multa/);
    expect(a.mensagem).toMatch(/3º vez passa a haver multa de R\$ 3,00/);
    expect(a.mensagem).toMatch(/faltam 2/);
    expect(a.botao).toBe('Entendi');
  });

  it('na segunda, o texto muda para "falta uma"', () => {
    expect(avisoDeAtraso({ contagem: 2 }).mensagem).toMatch(/falta uma/);
  });

  it('na terceira, há multa — e o aviso diz o valor', () => {
    const a = avisoDeAtraso({ contagem: 3 });
    expect(a.mensagem).toMatch(/3º atraso/);
    expect(a.mensagem).toMatch(/multa de R\$ 3,00 no seu próximo atendimento/);
  });

  it('o backend manda quem decide: `multa` vence a contagem', () => {
    expect(avisoDeAtraso({ contagem: 1, multa: true }).mensagem).toMatch(/multa/);
    expect(avisoDeAtraso({ contagem: 5, multa: false }).mensagem).toMatch(/sem multa/);
  });

  it('SEM a contagem (o backend ainda não manda), não inventa ordinal', () => {
    const a = avisoDeAtraso({});
    expect(a.mensagem).not.toMatch(/\dº atraso/);
    expect(a.mensagem).toMatch(/por enquanto sem multa/);
    expect(a.mensagem).toMatch(/a partir da 3º/);
  });

  it('em todos os casos o cliente CONTINUA na fila — o atraso não o tira dela', () => {
    for (const s of [{}, { contagem: 1 }, { contagem: 3 }]) {
      expect(avisoDeAtraso(s).mensagem).toMatch(/continua na fila/);
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
