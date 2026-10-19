import {
  saidaDaFila,
  ehToqueDuplo,
  JANELA_DO_TOQUE_DUPLO_MS,
  regraDaMulta,
  avisoDaMultaDoServidor,
} from '@domain/queue/saidaDaFila';

// D15 (Andre, 24/09): dois toques seguidos para sair; com multa, confirmação
// "Sair / Cancelar"; sem multa, sai direto. Textos curtos: GUIA_DE_TEXTO.md §4.1.

const palavras = (texto: string) => texto.trim().split(/\s+/).length;

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
  it('com multa: a faixa diz o valor em uma linha, e há confirmação Sair / Cancelar', () => {
    const s = saidaDaFila({ multa: true });
    expect(s.faixa).toBe('Sair agora gera multa de R$ 3,00.');
    expect(s.confirmacao).toEqual({
      titulo: 'Sair da fila',
      mensagem: 'R$ 3,00 de multa no próximo atendimento.',
      sim: 'Sair',
      nao: 'Cancelar',
    });
  });

  it('a faixa não explica o gesto ("Toque 2 vezes para sair"): o valor da multa é o que importa', () => {
    for (const s of [{ multa: true }, { multa: false, minutos: 30 }, { multa: false, semPrevisao: true }]) {
      expect(saidaDaFila(s).faixa).not.toMatch(/toque|vezes/i);
    }
  });

  it('sem multa: retém, não diz que é de graça, e nada de confirmação', () => {
    const s = saidaDaFila({ multa: false, minutos: 74.2 });
    expect(s.faixa).toBe('Faltam só 75 min.');
    expect(s.faixa).not.toMatch(/R\$|grátis|sem custo/);
    expect(s.confirmacao).toBeNull();
  });

  it('sem multa e sem os minutos: só a pergunta', () => {
    expect(saidaDaFila({ multa: false }).faixa).toBe('Tem certeza?');
    expect(saidaDaFila({ multa: false, minutos: 0 }).faixa).toBe('Tem certeza?');
  });

  it('sem previsão: não afirma multa nem ausência dela — e confirma, por via das dúvidas', () => {
    const s = saidaDaFila({ multa: false, semPrevisao: true });
    expect(s.faixa).toBe('Sair a menos de 1 h da vez gera multa de R$ 3,00.');
    expect(s.confirmacao).not.toBeNull();
    // A multa continua condicional também no corpo da confirmação.
    expect(s.confirmacao?.mensagem).toBe(s.faixa);
  });

  it('o valor informado entra no texto', () => {
    expect(saidaDaFila({ multa: true, valor: 5 }).faixa).toMatch(/R\$ 5,00/);
  });
});

// Guia de texto, §1 ("Como se verifica"): rótulo de até 2 palavras, corpo de até
// 70 caracteres, título que diz o fato (sem "?"), nunca "Sim, ..." nem "Não".
describe('as medidas do guia de texto', () => {
  const caixas = [
    saidaDaFila({ multa: true }).confirmacao!,
    saidaDaFila({ multa: true, valor: 5 }).confirmacao!,
    saidaDaFila({ multa: false, semPrevisao: true }).confirmacao!,
    avisoDaMultaDoServidor(5),
  ];

  it.each(caixas.map((c, i) => [i, c] as const))('a caixa %i: título, corpo e botões', (_i, caixa) => {
    expect(caixa.titulo).toBe('Sair da fila');
    expect(palavras(caixa.titulo)).toBeLessThanOrEqual(4);
    expect(caixa.mensagem.length).toBeLessThanOrEqual(70);
    expect(caixa.sim).toBe('Sair');
    expect(caixa.nao).toBe('Cancelar');
  });

  it('as faixas cabem em uma linha', () => {
    for (const s of [{ multa: true }, { multa: false, minutos: 75 }, { multa: false, semPrevisao: true }]) {
      expect(saidaDaFila(s).faixa.length).toBeLessThanOrEqual(70);
    }
  });

  it('o aviso do servidor usa o valor DELE, em uma linha', () => {
    expect(avisoDaMultaDoServidor(5).mensagem).toBe('R$ 5,00 de multa no próximo atendimento.');
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
