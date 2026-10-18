import {
  avisoDaPendencia,
  pendenciasDoErro,
  podeAvisarQuePagou,
  reais,
  textoDoStatus,
} from '@domain/pagamento/pendencia';

// pendencia-de-pagamento (CLI-30).

describe('pendência de pagamento — domínio', () => {
  it('reais aceita número, texto (BigDecimal) e falta', () => {
    expect(reais(45)).toBe('R$ 45,00');
    expect(reais('12.5')).toBe('R$ 12,50');
    expect(reais(null)).toBe('R$ 0,00');
    expect(reais('x')).toBe('R$ 0,00');
  });

  it('o status em uma linha', () => {
    expect(textoDoStatus('PAID')).toBe('Pago');
    expect(textoDoStatus('AWAITING_CONFIRMATION')).toBe('Aguardando o profissional confirmar');
    expect(textoDoStatus('PENDING')).toBe('Pagamento pendente');
    expect(textoDoStatus(null)).toBe('Pagamento pendente');
  });

  it('"Já paguei" só do pendente', () => {
    expect(podeAvisarQuePagou('PENDING')).toBe(true);
    expect(podeAvisarQuePagou('AWAITING_CONFIRMATION')).toBe(false);
    expect(podeAvisarQuePagou(undefined)).toBe(false);
  });

  it('o 409 PAYMENT_PENDING traz os itens; outro erro não é pendência', () => {
    const itens = [{ attendance_id: 'a1', status: 'PENDING', amount: 45 }];
    expect(pendenciasDoErro({ response: { status: 409, data: { code: 'PAYMENT_PENDING', items: itens } } })).toEqual(itens);
    expect(pendenciasDoErro({ response: { status: 409, data: { code: 'PAYMENT_PENDING' } } })).toEqual([]);
    expect(pendenciasDoErro({ response: { status: 409, data: { code: 'OUTRO' } } })).toBeNull();
    expect(pendenciasDoErro(null)).toBeNull();
  });

  it('o aviso soma o que falta e diz com quem, quando é um só', () => {
    expect(avisoDaPendencia([{ attendance_id: 'a1', status: 'PENDING', amount: '45', professional_name: 'Carlos' }])).toEqual({
      titulo: 'Pagamento pendente',
      mensagem: 'R$ 45,00 com Carlos.',
    });
    expect(
      avisoDaPendencia([
        { attendance_id: 'a1', status: 'PENDING', amount: 10 },
        { attendance_id: 'a2', status: 'AWAITING_CONFIRMATION', amount: 'x', professional_name: 'Ana' },
      ]).mensagem,
    ).toBe('R$ 10,00.');
    expect(avisoDaPendencia([]).mensagem).toBe('Há um pagamento pendente. Pague para marcar de novo.');
  });
});
