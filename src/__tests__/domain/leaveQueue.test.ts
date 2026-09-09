import { jaSaiuDaFila, mensagemDeFalhaAoSair } from '@domain/queue/leave';

// Ate 07/09 o cancelamento vivia dentro de um `catch {}` VAZIO: falhasse o que
// falhasse, o cliente saia da tela. Ele achava que tinha saido da fila — e a
// vez e a multa seguiam de pe, sem ninguem saber. Estes testes existem para
// que a distincao entre "falhou" e "ja nao estava na fila" nao se perca de
// novo: as duas levam a telas opostas.

describe('sair da fila: quando a falha ainda significa sucesso', () => {
  it('404 = o atendimento ja nao esta la, entao a saida SEGUE', () => {
    expect(jaSaiuDaFila({ response: { status: 404 } })).toBe(true);
  });

  it('CLIENT_NOT_IN_QUEUE tambem — o profissional pode ter removido antes', () => {
    expect(jaSaiuDaFila({ response: { data: { code: 'CLIENT_NOT_IN_QUEUE' } } })).toBe(true);
  });

  it('500, 401 e rede fora NAO liberam a saida — o cliente continua na fila', () => {
    // Este e o caso que o catch vazio escondia: some da tela, continua na fila.
    expect(jaSaiuDaFila({ response: { status: 500 } })).toBe(false);
    expect(jaSaiuDaFila({ response: { status: 401 } })).toBe(false);
    expect(jaSaiuDaFila(new Error('Network Error'))).toBe(false);
    expect(jaSaiuDaFila(undefined)).toBe(false);
    expect(jaSaiuDaFila(null)).toBe(false);
  });

  it('403 nao e "ja saiu" — negar permissao e outra coisa', () => {
    expect(jaSaiuDaFila({ response: { status: 403 } })).toBe(false);
  });
});

describe('a mensagem diz em que estado o cliente ficou', () => {
  it('usa a mensagem do backend quando existe', () => {
    expect(
      mensagemDeFalhaAoSair({ response: { data: { message: 'Atendimento em andamento' } } }),
    ).toBe('Atendimento em andamento');
  });

  it('sem mensagem, a frase padrao diz que ele CONTINUA na fila', () => {
    // "Erro ao cancelar" nao informa a unica coisa que importa: se saiu ou nao.
    const msg = mensagemDeFalhaAoSair(new Error('timeout'));
    expect(msg).toMatch(/continua na fila/i);
  });
});
