import { contatoDoProfissional } from '@domain/professional/contato';

describe('contatoDoProfissional (CLI-10)', () => {
  it('null, vazio ou so espacos: o profissional nao quis expor — sem contato', () => {
    expect(contatoDoProfissional(null)).toBeNull();
    expect(contatoDoProfissional(undefined)).toBeNull();
    expect(contatoDoProfissional('   ')).toBeNull();
  });

  it('so texto (Andre, 05/10): o numero como o profissional escreveu, sem link', () => {
    expect(contatoDoProfissional('+55 (11) 98888-7777')).toEqual({ exibir: '+55 (11) 98888-7777' });
  });

  it('sem o pais, DDD + numero (celular e fixo) e do Brasil', () => {
    expect(contatoDoProfissional('(11) 98888-7777')?.exibir).toBe('(11) 98888-7777');
    expect(contatoDoProfissional('11 3333-4444')?.exibir).toBe('11 3333-4444');
  });

  it('com 55 na frente sem o "+", tambem vale', () => {
    expect(contatoDoProfissional('5511988887777')).not.toBeNull();
  });

  it('com "+" de outro pais, mantem o numero como veio', () => {
    expect(contatoDoProfissional(' +351 912 345 678 ')?.exibir).toBe('+351 912 345 678');
  });

  it('numero incompleto ou texto nao vira contato', () => {
    expect(contatoDoProfissional('98888-7777')).toBeNull();
    expect(contatoDoProfissional('+12')).toBeNull();
    expect(contatoDoProfissional('ligue na loja')).toBeNull();
  });
});
