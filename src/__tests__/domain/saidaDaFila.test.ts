import { saidaDaFila, ehToqueDuplo, JANELA_DO_TOQUE_DUPLO_MS, regraDaMulta } from '@domain/queue/saidaDaFila';

// D15 (Andre, 24/09): dois toques seguidos para sair; com multa, confirmação
// "Sim / Não"; sem multa, sai direto.

describe('toque duplo em "Sair da fila"', () => {
  it('o primeiro toque nunca é duplo', () => {
    expect(ehToqueDuplo(null, 1000)).toBe(false);
  });

  it('dentro da janela é duplo; fora, recomeça', () => {
    expect(ehToqueDuplo(1000, 1000 + JANELA_DO_TOQUE_DUPLO_MS)).toBe(true);
    expect(ehToqueDuplo(1000, 1000 + JANELA_DO_TOQUE_DUPLO_MS + 1)).toBe(false);
  });
});

describe('o que a saída diz', () => {
  it('com multa: a faixa diz o valor e o porquê, e há confirmação Sim / Não', () => {
    const s = saidaDaFila({ multa: true });
    expect(s.faixa).toBe('Sair agora gera multa de R$ 3,00.');
    expect(s.confirmacao?.sim).toBe('Sair');
    expect(s.confirmacao?.nao).toBe('Cancelar');
    expect(s.confirmacao?.mensagem).toBe('R$ 3,00 de multa no próximo atendimento.');
  });

  it('isento (DEC-104): há caixa Cancelar / Sair, e nada fala de multa', () => {
    const s = saidaDaFila({ multa: false, isento: true });
    expect(s.faixa).toBe('Você perde a sua vez.');
    expect(s.confirmacao).toEqual({ titulo: 'Sair da fila', mensagem: 'Você perde a sua vez.', sim: 'Sair', nao: 'Cancelar' });
    expect(`${s.faixa} ${s.confirmacao?.mensagem}`).not.toMatch(/multa|R\$/i);
    expect(s.valorConfirmado).toBeNull();
  });

  it('sem multa: retém, não diz que é de graça, e nada de confirmação', () => {
    const s = saidaDaFila({ multa: false, minutos: 74.2 });
    expect(s.faixa).toBe('Faltam só 75 min.');
    expect(s.faixa).not.toMatch(/R\$|grátis|sem custo/);
    expect(s.confirmacao).toBeNull();
  });

  it('sem multa e sem os minutos: só o que se perde', () => {
    expect(saidaDaFila({ multa: false }).faixa).toBe('Você perde a sua vez.');
    expect(saidaDaFila({ multa: false, minutos: 0 }).faixa).toBe('Você perde a sua vez.');
  });

  it('sem previsão: não afirma multa nem ausência dela — e confirma, por via das dúvidas', () => {
    const s = saidaDaFila({ multa: false, semPrevisao: true });
    expect(s.faixa).toMatch(/Sair a menos de 1 h da vez gera multa/);
    expect(s.confirmacao).not.toBeNull();
  });

  it('o valor informado entra no texto', () => {
    expect(saidaDaFila({ multa: true, valor: 5 }).faixa).toMatch(/R\$ 5,00/);
  });
});

describe('a regra da multa dita antes de entrar (CDC)', () => {
  it('diz o limite, o valor, quando é cobrada e a saída sem custo', () => {
    const t = regraDaMulta();
    expect(t).toMatch(/menos de 1 hora/);
    expect(t).toMatch(/R\$ 3,00/);
    expect(t).toMatch(/próximo atendimento/);
    expect(t).toMatch(/Trocar de lugar .* não tem custo/);
  });
});
