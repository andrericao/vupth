import { CUPOM_LIGADO, cupomDigitado, mensagemDoCupom, nomeDaCampanha } from '@domain/campanhas';

// cupom-no-app (15/10, Backend 4a94610): o cupom digitado, as recusas em uma
// frase curta e o nome na lista.

const erro = (code?: string) => ({ response: { data: { code } } });

describe('cupom', () => {
  it('nasce desligado, até o Backend subir', () => {
    expect(CUPOM_LIGADO).toBe(false);
  });

  it('tira os espaços das pontas', () => {
    expect(cupomDigitado('  VUPTH10 ')).toBe('VUPTH10');
  });

  it('cada recusa do Backend vira uma frase curta', () => {
    expect(mensagemDoCupom(erro('CAMPAIGN_NOT_FOUND'))).toBe('Cupom não encontrado.');
    expect(mensagemDoCupom(erro('CAMPAIGN_NOT_AVAILABLE'))).toBe('Este cupom não está valendo agora.');
    expect(mensagemDoCupom(erro('CAMPAIGN_ALREADY_REDEEMED'))).toBe('Você já usou este cupom.');
    expect(mensagemDoCupom(erro('CAMPAIGN_NOT_FOR_YOU'))).toBe('Este cupom não vale para a sua conta.');
    expect(mensagemDoCupom(erro())).toMatch(/Tente de novo/);
    expect(mensagemDoCupom(null)).toMatch(/Tente de novo/);
  });

  it('o nome da lista: o da campanha, senão o código', () => {
    expect(nomeDaCampanha({ id: '1', name: 'Lançamento', code: 'X' })).toBe('Lançamento');
    expect(nomeDaCampanha({ id: '1', code: 'X' })).toBe('X');
    expect(nomeDaCampanha({ id: '1' })).toBe('Cupom');
  });
});
