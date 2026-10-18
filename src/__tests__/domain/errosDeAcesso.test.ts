import {
  AVISO_SEM_CONTA,
  erroDeAcesso,
  mensagemDeMuitasTentativas,
  segundosDeEspera,
} from '@domain/auth/errosDeAcesso';

// Contrato do Backend (03/10, fd9a3af): EMAIL_NOT_FOUND no login (401) e no
// esqueci (404); 429 TOO_MANY_REQUESTS com Retry-After nos tres.

const resposta = (status: number, data: object = {}, headers: object = {}) => ({
  response: { status, data, headers },
});

describe('segundosDeEspera — o Retry-After', () => {
  it('em segundos', () => {
    expect(segundosDeEspera(resposta(429, {}, { 'retry-after': '40' }))).toBe(40);
  });

  it('com o nome em maiúsculas também', () => {
    expect(segundosDeEspera(resposta(429, {}, { 'Retry-After': 12 }))).toBe(12);
  });

  it('como data HTTP, contado a partir de agora', () => {
    const agora = Date.parse('2026-10-03T13:00:00Z');
    const erro = resposta(429, {}, { 'retry-after': 'Sat, 03 Oct 2026 13:01:30 GMT' });
    expect(segundosDeEspera(erro, agora)).toBe(90);
  });

  it('sem header, ilegível, zero ou já passado: null', () => {
    expect(segundosDeEspera(resposta(429))).toBeNull();
    expect(segundosDeEspera(resposta(429, {}, { 'retry-after': 'logo' }))).toBeNull();
    expect(segundosDeEspera(resposta(429, {}, { 'retry-after': '0' }))).toBeNull();
    const agora = Date.parse('2026-10-03T13:05:00Z');
    expect(segundosDeEspera(resposta(429, {}, { 'retry-after': 'Sat, 03 Oct 2026 13:00:00 GMT' }), agora)).toBeNull();
    expect(segundosDeEspera(undefined)).toBeNull();
  });
});

describe('mensagemDeMuitasTentativas', () => {
  it('abaixo de um minuto, em segundos', () => {
    expect(mensagemDeMuitasTentativas(40)).toBe('Muitas tentativas seguidas. Tente de novo em 40 s.');
  });

  it('de um minuto para cima, em minutos arredondados para cima', () => {
    expect(mensagemDeMuitasTentativas(60)).toBe('Muitas tentativas seguidas. Tente de novo em 1 min.');
    expect(mensagemDeMuitasTentativas(61)).toBe('Muitas tentativas seguidas. Tente de novo em 2 min.');
  });

  it('sem o tempo, "em instantes"', () => {
    expect(mensagemDeMuitasTentativas(null)).toBe('Muitas tentativas seguidas. Tente de novo em instantes.');
  });
});

describe('erroDeAcesso', () => {
  it('401 EMAIL_NOT_FOUND do login: sem conta', () => {
    expect(erroDeAcesso(resposta(401, { code: 'EMAIL_NOT_FOUND' }), 'x')).toEqual({ tipo: 'sem-conta' });
  });

  it('404 EMAIL_NOT_FOUND do esqueci: sem conta', () => {
    expect(erroDeAcesso(resposta(404, { code: 'EMAIL_NOT_FOUND' }), 'x')).toEqual({ tipo: 'sem-conta' });
  });

  it('429: muitas tentativas, com o tempo do header', () => {
    expect(erroDeAcesso(resposta(429, { code: 'TOO_MANY_REQUESTS' }, { 'retry-after': '30' }), 'x')).toEqual({
      tipo: 'muitas-tentativas',
      titulo: 'Muitas tentativas',
      mensagem: 'Muitas tentativas seguidas. Tente de novo em 30 s.',
    });
  });

  it('o código TOO_MANY_REQUESTS basta, mesmo sem o status', () => {
    expect(erroDeAcesso({ response: { data: { code: 'TOO_MANY_REQUESTS' } } }, 'x').tipo).toBe('muitas-tentativas');
  });

  it('senha errada (BAD_CREDENTIALS): a mensagem em português do código (erros-em-portugues)', () => {
    expect(erroDeAcesso(resposta(401, { code: 'BAD_CREDENTIALS', message: 'Senha incorreta' }), 'x')).toEqual({
      tipo: 'outro',
      mensagem: 'E-mail ou senha incorretos.',
    });
  });

  it('sem mensagem do servidor: a do erro, depois a padrão', () => {
    expect(erroDeAcesso({ message: 'Network Error' }, 'Erro ao entrar')).toEqual({ tipo: 'outro', mensagem: 'Sem conexão com o servidor. Confira a sua internet.' });
    expect(erroDeAcesso(undefined, 'Erro ao entrar')).toEqual({ tipo: 'outro', mensagem: 'Erro ao entrar' });
  });

  it('o aviso de sem conta oferece corrigir e criar', () => {
    expect(AVISO_SEM_CONTA.corrigir).toBe('Corrigir');
    expect(AVISO_SEM_CONTA.criar).toBe('Criar conta');
  });
});
