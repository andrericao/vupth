import { MENSAGEM_POR_CODIGO, mensagemDoErro, pareceIngles } from '@domain/erros/mensagemDoErro';
import { erroDeAcesso } from '@domain/auth/errosDeAcesso';

// erros-em-portugues (CLI-1, Andre 17/10): o ingles do servidor nao chega a tela.

const api = (data: object) => ({ response: { data } });

describe('mensagemDoErro', () => {
  it('traduz pelo codigo, mesmo com a mensagem em ingles', () => {
    expect(mensagemDoErro(api({ code: 'EMAIL_NOT_FOUND', message: 'E-mail not registered' }), 'x')).toBe(
      'Este e-mail não está cadastrado. Confira ou crie uma conta.',
    );
    expect(mensagemDoErro(api({ code: 'BAD_CREDENTIALS', message: 'Invalid email or password' }), 'x')).toBe(
      'E-mail ou senha incorretos.',
    );
  });

  it('sem codigo conhecido, traduz os textos em ingles que conhecemos', () => {
    expect(mensagemDoErro(api({ message: 'E-mail not registered' }), 'x')).toBe(MENSAGEM_POR_CODIGO.EMAIL_NOT_FOUND);
    expect(mensagemDoErro({ message: 'Network Error' }, 'x')).toBe('Sem conexão com o servidor. Confira a sua internet.');
    expect(mensagemDoErro({ message: 'timeout of 15000ms exceeded' }, 'x')).toBe('A conexão demorou demais. Tente de novo.');
    expect(mensagemDoErro({ message: 'Request failed with status code 503' }, 'x')).toBe(MENSAGEM_POR_CODIGO.INTERNAL_ERROR);
  });

  it('ingles desconhecido cai no padrao; portugues do servidor passa como veio', () => {
    expect(mensagemDoErro(api({ code: 'NOVO', message: 'Client can only rate their own attendance.' }), 'Erro ao avaliar')).toBe(
      'Erro ao avaliar',
    );
    expect(mensagemDoErro({ message: 'Request failed with status code 401' }, 'Erro ao avaliar')).toBe('Erro ao avaliar');
    expect(mensagemDoErro({ message: 'x' }, 'Erro ao avaliar')).toBe('Erro ao avaliar');
    expect(mensagemDoErro(api({ message: 'O preço deve terminar em ,90' }), 'x')).toBe('O preço deve terminar em ,90');
    expect(mensagemDoErro(api({ message: 'Nao sobrou refeicao para hoje' }), 'x')).toBe('Nao sobrou refeicao para hoje');
  });

  it('sem nada util, o padrao; erro nulo nao estoura', () => {
    expect(mensagemDoErro(api({}), 'Erro ao salvar')).toBe('Erro ao salvar');
    expect(mensagemDoErro(null, 'Erro ao salvar')).toBe('Erro ao salvar');
    expect(mensagemDoErro(undefined, 'p')).toBe('p');
  });

  it('pareceIngles: acento e portugues; palavra tipica e ingles', () => {
    expect(pareceIngles('Você não pode')).toBe(false);
    expect(pareceIngles('Account is disabled')).toBe(true);
    expect(pareceIngles('Pedido enviado')).toBe(false);
  });

  it('todas as mensagens por codigo estao em portugues', () => {
    for (const [codigo, texto] of Object.entries(MENSAGEM_POR_CODIGO)) {
      expect({ codigo, ingles: pareceIngles(texto) }).toEqual({ codigo, ingles: false });
    }
  });
});

describe('erroDeAcesso sem o codigo', () => {
  it('"E-mail not registered" sem code ainda e o e-mail sem conta (nao o ingles na tela)', () => {
    expect(erroDeAcesso(api({ message: 'E-mail not registered' }), 'Erro ao fazer login')).toEqual({ tipo: 'sem-conta' });
  });

  it('o resto passa por mensagemDoErro', () => {
    expect(erroDeAcesso(api({ code: 'BAD_CREDENTIALS', message: 'Invalid email or password' }), 'p')).toEqual({
      tipo: 'outro',
      mensagem: 'E-mail ou senha incorretos.',
    });
  });
});
