import { avisoDeAtraso, precisaAvisarAtraso } from '../../domain/queue/ciencia';

// "Não podemos agir na surdina" (Andre, 18/09): o cliente nunca é multado nem
// marcado como atrasado sem ter TOCADO num aviso. E o atraso avisa mesmo SEM
// multa, porque é a contagem que torna a terceira vez justa.

describe('avisoDeAtraso', () => {
  // textos-curtos (guia 4.3): título "Você trocou de lugar" antes da multa; "3º atraso" na multa.
  it('sem multa, diz qual atraso é e o que vem no 3º', () => {
    const a = avisoDeAtraso({ contagem: 1 });
    expect(a.titulo).toBe('Você trocou de lugar');
    expect(a.mensagem).toBe('Esteja na loja em até 5 minutos. Este é o seu 1º atraso (1 de 3). No 3º, multa de R$ 5,00 e você sai da fila.');
    // atraso-na-fila-vazia-client (DEC-101): o prazo para chegar.
    expect(avisoDeAtraso({}).mensagem).toMatch(/^Esteja na loja em até 5 minutos\./);
    expect(avisoDeAtraso({ contagem: 3 }).mensagem).not.toMatch(/Esteja na loja/);
    expect(a.botao).toBe('Entendi');
  });

  it('na segunda, o ordinal muda', () => {
    expect(avisoDeAtraso({ contagem: 2 }).mensagem).toMatch(/Este é o seu 2º atraso \(2 de 3\)/);
  });

  it('na terceira, há multa — e o aviso diz o valor e que saiu da fila (a454b4b)', () => {
    const a = avisoDeAtraso({ contagem: 3 });
    expect(a.titulo).toBe('3º atraso');
    expect(a.mensagem).toBe('Multa de R$ 5,00 e você saiu da fila. Pague a multa para zerar a contagem.');
  });

  it('o backend manda quem decide: `multa` vence a contagem', () => {
    expect(avisoDeAtraso({ contagem: 1, multa: true }).mensagem).toMatch(/Multa/);
    expect(avisoDeAtraso({ contagem: 5, multa: false }).mensagem).toMatch(/No 3º, multa de/);
  });

  it('multa sem contagem: diz o valor e o fim da fila, sem ordinal', () => {
    const a = avisoDeAtraso({ multa: true });
    expect(a.mensagem).not.toMatch(/\dº atraso/);
    expect(a.mensagem).toMatch(/^Multa de R\$ 5,00/);
  });

  // Andre, 26/09 (esboço): desde o 1º atraso, tom positivo e a opção de adiar.
  it('antes da multa: título positivo e oferece adiar; no 3º, não', () => {
    for (const s of [{}, { contagem: 1 }, { contagem: 2 }]) {
      const a = avisoDeAtraso(s);
      expect(a.titulo).toBe('Você trocou de lugar');
      expect(a.oferecerAdiar).toBe(true);
    }
    expect(avisoDeAtraso({ contagem: 3 }).oferecerAdiar).toBe(false);
  });

  it('SEM a contagem (o backend ainda não manda), não inventa ordinal', () => {
    const a = avisoDeAtraso({});
    expect(a.mensagem).not.toMatch(/Este é o seu/);
    expect(a.mensagem).toMatch(/Sem multa por enquanto/);
    expect(a.mensagem).toMatch(/No 3º atraso, multa de R\$ 5,00 e você sai da fila/);
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
