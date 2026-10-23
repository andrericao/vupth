import {
  CUPOM_LIGADO,
  cupomDigitado,
  mensagemDoCupom,
  nomeDaCampanha,
  regraDoCupom,
  separarCupons,
  situacaoDoCupom,
  validadeDoCupom,
} from '@domain/campanhas';

// cupom-no-app (15/10, Backend 4a94610): o cupom digitado, as recusas em uma
// frase curta e o nome na lista.

const erro = (code?: string) => ({ response: { data: { code } } });

describe('cupom', () => {
  it('está ligado desde o Backend 5de02e0', () => {
    expect(CUPOM_LIGADO).toBe(true);
  });

  it('a regra em uma frase: percentual, valor ou o benefício', () => {
    expect(regraDoCupom({ id: '1', value_percent: 10 })).toBe('10% de desconto');
    expect(regraDoCupom({ id: '1', value_amount: 5 })).toMatch(/^R\$\s?5,00 de desconto$/);
    expect(regraDoCupom({ id: '1', benefit: 'Sem taxa' })).toBe('Sem taxa');
    expect(regraDoCupom({ id: '1' })).toBe('');
  });

  it('a validade é o fim da campanha; sem data, vazio', () => {
    expect(validadeDoCupom({ id: '1', ends_at: '2026-11-05T12:00:00' })).toBe('Vale até 05/11');
    expect(validadeDoCupom({ id: '1', ends_at: 'x' })).toBe('');
    expect(validadeDoCupom({ id: '1' })).toBe('');
  });

  it('separa ativos de usados e vencidos; sem status, vale como ativo', () => {
    const lista = [
      { id: 'a', status: 'ACTIVE' as const },
      { id: 'b', status: 'USED' as const },
      { id: 'c', status: 'EXPIRED' as const },
      { id: 'd' },
      { id: 'e', used: true },
    ];
    const { ativos, encerrados } = separarCupons(lista);
    expect(ativos.map((c) => c.id)).toEqual(['a', 'd']);
    expect(encerrados.map((c) => c.id)).toEqual(['b', 'c', 'e']);
    expect(situacaoDoCupom(lista[1])).toBe('Usado');
    expect(situacaoDoCupom(lista[4])).toBe('Usado');
    expect(situacaoDoCupom(lista[2])).toBe('Vencido');
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
