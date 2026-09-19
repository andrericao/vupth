import { recusaAoEntrar, atendimentoNaFilaDoProfissional } from '../../domain/queue/entrarNaFila';

// Andre, 18/09: "a tela de aviso de que já está na fila deveria ser um popup,
// não uma tela branca com log do backend". Os três portões chegam como 409 com
// `code` próprio (confirmado pelo backend em 19/09).

const erro = (code?: string, message?: string) => ({
  response: { status: 409, data: { code, message } },
});

describe('recusaAoEntrar', () => {
  it('reconhece os três portões pelo código', () => {
    expect(recusaAoEntrar(erro('CLIENT_ALREADY_IN_QUEUE')).tipo).toBe('ja-na-fila');
    expect(recusaAoEntrar(erro('PROFESSIONAL_NOT_ACCEPTING_NEW')).tipo).toBe('nao-aceita');
    expect(recusaAoEntrar(erro('ESTABLISHMENT_NOT_OPEN')).tipo).toBe('loja-fechada');
  });

  it('já na fila: o texto DIZ O CAMINHO, em vez de repetir o log do servidor', () => {
    const r = recusaAoEntrar(erro('CLIENT_ALREADY_IN_QUEUE', 'Voce ja esta na fila deste profissional. Conclua ou cancele...'));
    expect(r.mensagem).toMatch(/Ver minha fila/);
    expect(r.mensagem).not.toMatch(/Conclua ou cancele/);
  });

  it('erro desconhecido cai na mensagem do servidor, que é melhor que nada', () => {
    expect(recusaAoEntrar(erro('SEI_LA', 'Explicação do servidor')).mensagem).toBe('Explicação do servidor');
    expect(recusaAoEntrar({ message: 'Network Error' }).mensagem).toBe('Network Error');
    expect(recusaAoEntrar(undefined).mensagem).toBe('Erro ao entrar na fila');
  });
});

describe('atendimentoNaFilaDoProfissional', () => {
  // O 409 não traz o id do atendimento existente (decisão do backend: "a
  // mensagem ao usuário não carrega id"), então o app acha pelo profissional.
  const hist = [
    { id: 'a1', professionalId: 'p9', status: 'FINISHED' },
    { id: 'a2', professionalId: 'p1', status: 'SCHEDULED' },
    { id: 'a3', professionalId: 'p2', status: 'IN_PROGRESS' },
  ];

  it('acha o atendimento ocupado daquele profissional', () => {
    expect(atendimentoNaFilaDoProfissional(hist, 'p1')?.id).toBe('a2');
    expect(atendimentoNaFilaDoProfissional(hist, 'p2')?.id).toBe('a3');
  });

  it('ignora o que já terminou — e o de outro profissional', () => {
    expect(atendimentoNaFilaDoProfissional(hist, 'p9')).toBeNull();
    expect(atendimentoNaFilaDoProfissional(hist, 'p3')).toBeNull();
  });

  it('LATE conta como ocupado: é o bloqueio do backend, não o nosso', () => {
    const late = [{ id: 'a4', professionalId: 'p1', status: 'LATE' }];
    expect(atendimentoNaFilaDoProfissional(late, 'p1')?.id).toBe('a4');
  });
});
