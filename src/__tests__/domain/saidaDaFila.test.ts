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
    expect(s.faixa).toMatch(/multa de R\$ 3,00/);
    expect(s.faixa).toMatch(/duas vezes seguidas/);
    expect(s.confirmacao?.sim).toBe('Sim, sair');
    expect(s.confirmacao?.nao).toBe('Não');
  });

  it('sem multa: só a instrução, e nada de confirmação', () => {
    const s = saidaDaFila({ multa: false });
    expect(s.faixa).toMatch(/duas vezes seguidas/);
    expect(s.faixa).not.toMatch(/R\$/);
    expect(s.confirmacao).toBeNull();
  });

  it('sem previsão: não afirma multa nem ausência dela — e confirma, por via das dúvidas', () => {
    const s = saidaDaFila({ multa: false, semPrevisao: true });
    expect(s.faixa).toMatch(/Se faltar menos de 1 hora/);
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
