import { contatoDoProfissional } from '@domain/professional/contato';

describe('contatoDoProfissional (CLI-10)', () => {
  it('null, vazio ou so espacos: o profissional nao quis expor — sem contato', () => {
    expect(contatoDoProfissional(null)).toBeNull();
    expect(contatoDoProfissional(undefined)).toBeNull();
    expect(contatoDoProfissional('   ')).toBeNull();
  });

  it('o formato do contrato (+55 (11) 98888-7777): ligar e WhatsApp com o pais', () => {
    expect(contatoDoProfissional('+55 (11) 98888-7777')).toEqual({
      exibir: '+55 (11) 98888-7777',
      ligar: 'tel:+5511988887777',
      whatsapp: 'https://wa.me/5511988887777',
    });
  });

  it('sem o pais, DDD + numero (celular e fixo) e do Brasil', () => {
    expect(contatoDoProfissional('(11) 98888-7777')?.whatsapp).toBe('https://wa.me/5511988887777');
    expect(contatoDoProfissional('11 3333-4444')?.ligar).toBe('tel:+551133334444');
  });

  it('com 55 na frente sem o "+", tambem vale', () => {
    expect(contatoDoProfissional('5511988887777')?.ligar).toBe('tel:+5511988887777');
  });

  it('com "+" de outro pais, mantem o numero como veio', () => {
    expect(contatoDoProfissional('+351 912 345 678')?.whatsapp).toBe('https://wa.me/351912345678');
  });

  it('numero que nao da para discar nao vira contato', () => {
    expect(contatoDoProfissional('98888-7777')).toBeNull();
    expect(contatoDoProfissional('+12')).toBeNull();
    expect(contatoDoProfissional('ligue na loja')).toBeNull();
  });
});
