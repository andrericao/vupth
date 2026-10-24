import {
  aceiteDaTroca,
  avisoDeMenosDeUmaHora,
  precisaConfirmarMenosDeUmaHora,
  CATEGORIA_TROCA,
  ACAO_CONFIRMAR,
  ACAO_AGORA_NAO,
  CATEGORIA_TROCAR_RECUSAR,
  ACAO_TROCAR,
  ACAO_RECUSAR,
  CATEGORIA_ACEITAR_MANTER,
  ACAO_ACEITAR,
  ACAO_MANTER,
  ACOES_QUE_ACEITAM,
  recusaDaTroca,
} from '@domain/trocaPeloPush';

// troca-pela-notificacao (15/10, Backend 43efd61): o CONFIRMAR aceita o pedido,
// a oferta ou a vez adiantada; 409 SWAP_NEEDS_CONFIRMATION pede o aviso.

describe('o que o CONFIRMAR aceita', () => {
  it('pedido, oferta e vez adiantada, pelo id de cada um', () => {
    expect(aceiteDaTroca({ type: 'SWAP_REQUESTED', swapRequestId: 'r1' })).toEqual({ tipo: 'pedido', id: 'r1' });
    expect(aceiteDaTroca({ type: 'SWAP_OFFERED', offerId: 'o1' })).toEqual({ tipo: 'oferta', id: 'o1' });
    expect(aceiteDaTroca({ type: 'EARLIER_TURN_OFFERED', attendanceId: 'a1' })).toEqual({ tipo: 'adiantada', attendanceId: 'a1' });
  });

  it('sem o id, ou outro tipo, não aceita nada', () => {
    expect(aceiteDaTroca({ type: 'SWAP_REQUESTED' })).toBeNull();
    expect(aceiteDaTroca({ type: 'SWAP_OFFERED', offerId: '' })).toBeNull();
    expect(aceiteDaTroca({ type: 'EARLIER_TURN_OFFERED', attendanceId: 3 })).toBeNull();
    expect(aceiteDaTroca({ type: 'ATTENDANCE_STARTED' })).toBeNull();
    expect(aceiteDaTroca(null)).toBeNull();
  });

  it('ids da categoria e dos botões', () => {
    expect([CATEGORIA_TROCA, ACAO_CONFIRMAR, ACAO_AGORA_NAO]).toEqual(['TROCA', 'CONFIRMAR', 'AGORA_NAO']);
  });
});

describe('menos de 1 hora', () => {
  it('só o 409 SWAP_NEEDS_CONFIRMATION pede a confirmação', () => {
    expect(precisaConfirmarMenosDeUmaHora({ response: { status: 409, data: { code: 'SWAP_NEEDS_CONFIRMATION' } } })).toBe(true);
    expect(precisaConfirmarMenosDeUmaHora({ response: { status: 409, data: { code: 'OUTRO' } } })).toBe(false);
    expect(precisaConfirmarMenosDeUmaHora({ response: { status: 422 } })).toBe(false);
    expect(precisaConfirmarMenosDeUmaHora(null)).toBe(false);
  });

  it('o aviso diz a espera nova quando o push a traz, sem nome', () => {
    expect(avisoDeMenosDeUmaHora({ newWaitMinutes: 25 }).mensagem).toBe('Sua espera fica em 25 min. Sair da fila depois da troca gera multa.');
    expect(avisoDeMenosDeUmaHora({}).mensagem).toBe('Sair da fila depois da troca gera multa.');
    expect(avisoDeMenosDeUmaHora(null).titulo).toBe('Menos de 1 hora');
  });
});

// push-acoes-por-pergunta (24/10, Backend 7584964): a pergunta da tela vira botão.
describe('ações por pergunta', () => {
  it('ids das categorias e dos botões', () => {
    expect([CATEGORIA_TROCAR_RECUSAR, ACAO_TROCAR, ACAO_RECUSAR]).toEqual(['TROCAR_RECUSAR', 'TROCAR', 'RECUSAR']);
    expect([CATEGORIA_ACEITAR_MANTER, ACAO_ACEITAR, ACAO_MANTER]).toEqual(['ACEITAR_MANTER', 'ACEITAR', 'MANTER']);
    expect(ACOES_QUE_ACEITAM).toEqual(['CONFIRMAR', 'TROCAR', 'ACEITAR']);
  });

  it('o Recusar nega só o pedido de troca, pelo swapRequestId', () => {
    expect(recusaDaTroca({ type: 'SWAP_REQUESTED', swapRequestId: 'r1' })).toBe('r1');
    expect(recusaDaTroca({ type: 'SWAP_REQUESTED' })).toBeNull();
    expect(recusaDaTroca({ type: 'EARLIER_TURN_OFFERED', attendanceId: 'a1' })).toBeNull();
    expect(recusaDaTroca(null)).toBeNull();
  });
});
