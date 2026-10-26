import {
  CUPOM_LIGADO,
  cupomDigitado,
  mensagemDoCupom,
  nomeDaCampanha,
  regraDoCupom,
  avisoDeValidade,
  validadeDoTicket,
  valorDoTicket,
  beneficioEmPortugues,
  tipoEmPortugues,
  descontoDoCupom,
  fimDaCampanha,
  fimDoErro,
  textoDoFim,
  diasDoCupom,
  saibaMaisDoCupom,
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
    expect(mensagemDoCupom(erro('CAMPAIGN_ALREADY_REDEEMED'))).toBe('Este cupom já está ativado.');
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

// campanha-encerrada-esgotada-e-validade (DEC-124): o aviso de validade e o Saiba mais.
describe('validade do cupom', () => {
  it('avisa o prazo com hora; sem data, nada', () => {
    expect(avisoDeValidade({ id: 'a', ends_at: '2026-11-05T09:05:00' })).toBe('Válido até 05/11 às 09:05.');
    expect(avisoDeValidade({ id: 'a' })).toBe('');
    expect(avisoDeValidade({ id: 'a', ends_at: 'x' })).toBe('');
  });

  it('os dias saem em português; vazio ou estranho = todos os dias', () => {
    expect(diasDoCupom({ id: 'a', weekdays: 'SATURDAY, SUNDAY' })).toBe('sábado, domingo');
    expect(diasDoCupom({ id: 'a', weekdays: null })).toBe('todos os dias');
    expect(diasDoCupom({ id: 'a', weekdays: 'XYZ' })).toBe('todos os dias');
  });

  it('o Saiba mais junta descrição, regra, serviço, dias e prazo (sem prazo, sem a última linha)', () => {
    expect(saibaMaisDoCupom({ id: 'a', value_amount: 5, ends_at: '2026-11-05T21:30:00' })).toBe('R$ 5,00 de desconto\nVale para qualquer serviço.\nDias: todos os dias.\nPrazo: até 05/11 às 21:30.');
    expect(saibaMaisDoCupom({ id: 'a' })).toBe('Vale para qualquer serviço.\nDias: todos os dias.');
  });
});

describe('promoção encerrada e esgotada (DEC-124)', () => {
  const agora = new Date('2026-11-05T12:00:00');

  it('passou do prazo = encerrada; no prazo sem vaga = esgotada; senão, nada', () => {
    expect(fimDaCampanha({ id: 'a', ends_at: '2026-11-05T11:59:00' }, agora)).toBe('ENCERRADA');
    expect(fimDaCampanha({ id: 'a', ends_at: '2026-11-05T11:59:00', remaining_slots: 0 }, agora)).toBe('ENCERRADA');
    expect(fimDaCampanha({ id: 'a', ends_at: '2026-11-06T00:00:00', remaining_slots: 0 }, agora)).toBe('ESGOTADA');
    expect(fimDaCampanha({ id: 'a', ends_at: '2026-11-06T00:00:00', remaining_slots: 3 }, agora)).toBeNull();
    expect(fimDaCampanha({ id: 'a' }, agora)).toBeNull();
  });

  it('os códigos do Backend viram o mesmo fim; outro erro, nada', () => {
    const e = (code: string) => ({ response: { data: { code } } });
    expect(fimDoErro(e('CAMPAIGN_ENDED'))).toBe('ENCERRADA');
    expect(fimDoErro(e('CAMPAIGN_SOLD_OUT'))).toBe('ESGOTADA');
    expect(fimDoErro(e('OUTRO'))).toBeNull();
    expect(fimDoErro(null)).toBeNull();
    expect(mensagemDoCupom(e('CAMPAIGN_ENDED'))).toBe('Esta promoção foi encerrada.');
    expect(mensagemDoCupom(e('CAMPAIGN_SOLD_OUT'))).toBe('Esta promoção esgotou.');
  });

  it('são duas mensagens distintas', () => {
    expect(textoDoFim('ENCERRADA').titulo).toBe('Promoção encerrada');
    expect(textoDoFim('ESGOTADA').titulo).toBe('Promoção esgotada');
    expect(textoDoFim('ENCERRADA').mensagem).not.toBe(textoDoFim('ESGOTADA').mensagem);
  });
});

// cupom-abate-no-resumo (André, 24/10): quanto o cupom abate dos serviços.
describe('descontoDoCupom', () => {
  it('percentual sobre os serviços, valor fixo até o total, duas casas', () => {
    expect(descontoDoCupom({ id: 'a', value_percent: 10 }, 75)).toBe(7.5);
    expect(descontoDoCupom({ id: 'a', value_percent: 33.333 }, 10)).toBe(3.33);
    expect(descontoDoCupom({ id: 'a', value_amount: 10 }, 75)).toBe(10);
    expect(descontoDoCupom({ id: 'a', value_amount: 10 }, 8)).toBe(8);
  });

  it('sem cupom, sem valor ou sem serviço, não abate', () => {
    expect(descontoDoCupom(undefined, 75)).toBe(0);
    expect(descontoDoCupom({ id: 'a' }, 75)).toBe(0);
    expect(descontoDoCupom({ id: 'a', value_amount: 10 }, 0)).toBe(0);
  });
});

// cards-de-promocao-em-portugues (André, 24/10): "DISCOUNT" e "CASH" não aparecem na tela.
describe('português nos cards de promoção', () => {
  it('benefício e tipo do servidor viram português', () => {
    expect(beneficioEmPortugues('CASH')).toBe('Ganho em dinheiro');
    expect(beneficioEmPortugues('DISCOUNT')).toBe('Desconto');
    expect(tipoEmPortugues('REFERRAL_BONUS')).toBe('Indique e ganhe');
    expect(tipoEmPortugues('FEE_WAIVER')).toBe('Isenção da taxa');
    expect(tipoEmPortugues('DISCOUNT')).toBe('Desconto');
  });

  it('texto livre passa; código que o mapa não conhece não vai cru para a tela', () => {
    expect(beneficioEmPortugues('Corte grátis')).toBe('Corte grátis');
    expect(beneficioEmPortugues('NOVO_CODIGO')).toBe('');
    expect(tipoEmPortugues('NOVO_TIPO')).toBe('');
    expect(beneficioEmPortugues(null)).toBe('');
    expect(tipoEmPortugues(undefined)).toBe('');
  });

  it('a regra do cupom sem valor também sai em português', () => {
    expect(regraDoCupom({ id: '1', benefit: 'DISCOUNT' })).toBe('Desconto');
  });
});

// card-ticket-pontilhado (André, 24/10): o valor grande e a validade do ticket.
describe('ticket do cupom', () => {
  it('o valor é o percentual ou o valor em reais; sem nenhum, vazio', () => {
    expect(valorDoTicket({ id: 'a', value_percent: 10 })).toBe('10%');
    expect(valorDoTicket({ id: 'a', value_amount: 10 })).toBe('R$ 10,00');
    expect(valorDoTicket({ id: 'a' })).toBe('');
  });

  it('a validade sai sem o ponto final; sem data, vazia', () => {
    expect(validadeDoTicket({ id: 'a', ends_at: '2026-11-05T09:05:00' })).toBe('Válido até 05/11 às 09:05');
    expect(validadeDoTicket({ id: 'a' })).toBe('');
  });
});
