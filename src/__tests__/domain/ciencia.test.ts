import { avisoDeAtraso, precisaAvisarAtraso } from '../../domain/queue/ciencia';

// "Não podemos agir na surdina" (Andre, 18/09): o cliente nunca é multado nem
// marcado como atrasado sem ter TOCADO num aviso. E o atraso avisa mesmo SEM
// multa, porque é a contagem que torna a terceira vez justa.

describe('avisoDeAtraso', () => {
  it('sem multa, diz qual atraso é e quantos faltam para a multa', () => {
    const a = avisoDeAtraso({ contagem: 1 });
    expect(a.mensagem).toMatch(/1º atraso — sem multa/);
    expect(a.mensagem).toMatch(/No 3º, multa de R\$ 5,00 e você vai para o fim da fila/);
    expect(a.mensagem).toMatch(/trocou de lugar com o próximo/);
    expect(a.mensagem).toMatch(/faltam 2/);
    // atraso-na-fila-vazia-client (DEC-101): o prazo para chegar.
    expect(a.mensagem).toMatch(/^Esteja na loja em até 5 minutos\./);
    expect(avisoDeAtraso({}).mensagem).toMatch(/^Esteja na loja em até 5 minutos\./);
    expect(avisoDeAtraso({ contagem: 3 }).mensagem).not.toMatch(/Esteja na loja/);
    expect(a.botao).toBe('Entendi');
  });

  it('na segunda, o texto muda para "falta uma"', () => {
    expect(avisoDeAtraso({ contagem: 2 }).mensagem).toMatch(/falta um\)/);
  });

  it('na terceira, há multa — e o aviso diz o valor', () => {
    const a = avisoDeAtraso({ contagem: 3 });
    expect(a.mensagem).toMatch(/3º atraso/);
    expect(a.mensagem).toMatch(/multa de R\$ 5,00 no seu próximo atendimento/);
    expect(a.mensagem).toMatch(/fim da fila/);
    expect(a.mensagem).toMatch(/sair sem nova multa/);
  });

  it('o backend manda quem decide: `multa` vence a contagem', () => {
    expect(avisoDeAtraso({ contagem: 1, multa: true }).mensagem).toMatch(/multa/);
    expect(avisoDeAtraso({ contagem: 5, multa: false }).mensagem).toMatch(/sem multa/);
    // Contagem acima do limite sem multa não vira "faltam -2".
    expect(avisoDeAtraso({ contagem: 5, multa: false }).mensagem).not.toMatch(/faltam/);
  });

  it('multa sem contagem: diz o valor e o fim da fila, sem ordinal', () => {
    const a = avisoDeAtraso({ multa: true });
    expect(a.mensagem).not.toMatch(/\dº atraso/);
    expect(a.mensagem).toMatch(/^multa de R\$ 5,00/);
  });

  // Andre, 26/09 (esboço): desde o 1º atraso, tom positivo e a opção de adiar.
  it('antes da multa: título positivo e oferece adiar; no 3º, não', () => {
    for (const s of [{}, { contagem: 1 }, { contagem: 2 }]) {
      const a = avisoDeAtraso(s);
      expect(a.titulo).toBe('Não se atrase — evite a multa');
      expect(a.oferecerAdiar).toBe(true);
      expect(a.mensagem).toMatch(/adie a sua vez/);
    }
    expect(avisoDeAtraso({ contagem: 3 }).oferecerAdiar).toBe(false);
  });

  it('SEM a contagem (o backend ainda não manda), não inventa ordinal', () => {
    const a = avisoDeAtraso({});
    expect(a.mensagem).not.toMatch(/\dº atraso/);
    expect(a.mensagem).toMatch(/por enquanto sem multa/);
    expect(a.mensagem).toMatch(/no 3º, multa de R\$ 5,00/);
  });

  it('em todos os casos o cliente CONTINUA na fila — o atraso não o tira dela', () => {
    for (const s of [{}, { contagem: 1 }, { contagem: 2 }]) {
      expect(avisoDeAtraso(s).mensagem).toMatch(/continua na fila/);
    }
    // No 3º ele vai para o fim — ainda na fila, e pode sair sem nova multa.
    expect(avisoDeAtraso({ contagem: 3 }).mensagem).toMatch(/fim da fila\. Pode continuar nela/);
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
