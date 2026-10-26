// Troca de lugar pela notificacao (troca-pela-notificacao, DEC-51; contrato do
// Backend 43efd61). Os pushes SWAP_REQUESTED, SWAP_OFFERED e
// EARLIER_TURN_OFFERED chegam com a categoria TROCA: CONFIRMAR aceita dali
// mesmo, AGORA NAO so fecha. Se a espera cair a menos de 1 hora, o Backend
// responde 409 SWAP_NEEDS_CONFIRMATION: o app mostra o aviso e o CONFIRMAR
// manda de novo com confirmLessThanHour=true. Sem nome do outro cliente (Andre,
// 15/10): so o tempo de espera.

export const CATEGORIA_TROCA = 'TROCA';
export const ACAO_CONFIRMAR = 'CONFIRMAR';
export const ACAO_AGORA_NAO = 'AGORA_NAO';

// push-acoes-por-pergunta (24/10, Backend 7584964): ação no push só onde a tela pergunta a mesma coisa.
// SWAP_REQUESTED chega com TROCAR_RECUSAR (Trocar = PATCH /swap-requests/{id}?accept=true; Recusar =
// accept=false); EARLIER_TURN_OFFERED, com ACEITAR_MANTER (Aceitar = accept-earlier-turn; Manter não
// chama nada, vale o horário prometido). A categoria TROCA segue para a oferta (SWAP_OFFERED).
export const CATEGORIA_TROCAR_RECUSAR = 'TROCAR_RECUSAR';
export const ACAO_TROCAR = 'TROCAR';
export const ACAO_RECUSAR = 'RECUSAR';
export const CATEGORIA_ACEITAR_MANTER = 'ACEITAR_MANTER';
export const ACAO_ACEITAR = 'ACEITAR';
export const ACAO_MANTER = 'MANTER';

/** Os botões que aceitam a troca (o CONFIRMAR de sempre e os dois novos). */
export const ACOES_QUE_ACEITAM = [ACAO_CONFIRMAR, ACAO_TROCAR, ACAO_ACEITAR];

/** O botão responde pela API (aceita ou recusa a troca): quem trata a resposta não navega para tela nenhuma. */
export function ehAcaoQueResponde(acao: string): boolean {
  return ACOES_QUE_ACEITAM.includes(acao) || acao === ACAO_RECUSAR;
}

/** O pedido de troca que o Recusar nega, pelo `data` do push. `null` = nada a recusar. */
export function recusaDaTroca(data: unknown): string | null {
  const d = (data ?? {}) as Dados;
  return d.type === 'SWAP_REQUESTED' ? texto(d.swapRequestId) : null;
}

export type AceiteDaTroca =
  | { tipo: 'pedido'; id: string }
  | { tipo: 'oferta'; id: string }
  | { tipo: 'adiantada'; attendanceId: string };

type Dados = {
  type?: unknown;
  swapRequestId?: unknown;
  offerId?: unknown;
  attendanceId?: unknown;
};

const texto = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/** O que o CONFIRMAR aceita, pelo `data` do push. `null` = nada a aceitar. */
export function aceiteDaTroca(data: unknown): AceiteDaTroca | null {
  const d = (data ?? {}) as Dados;
  if (d.type === 'SWAP_REQUESTED') {
    const id = texto(d.swapRequestId);
    return id ? { tipo: 'pedido', id } : null;
  }
  if (d.type === 'SWAP_OFFERED') {
    const id = texto(d.offerId);
    return id ? { tipo: 'oferta', id } : null;
  }
  if (d.type === 'EARLIER_TURN_OFFERED') {
    const attendanceId = texto(d.attendanceId);
    return attendanceId ? { tipo: 'adiantada', attendanceId } : null;
  }
  return null;
}

/** O Backend pede a confirmacao de "menos de 1 hora" (409 SWAP_NEEDS_CONFIRMATION). */
export function precisaConfirmarMenosDeUmaHora(erro: unknown): boolean {
  const r = (erro as { response?: { status?: number; data?: { code?: string } } } | null)?.response;
  return r?.status === 409 && r.data?.code === 'SWAP_NEEDS_CONFIRMATION';
}

/** O aviso de menos de 1 hora, com a espera nova quando o push a trouxe. */
export function avisoDeMenosDeUmaHora(data: unknown): { titulo: string; mensagem: string } {
  const nova = (data as { newWaitMinutes?: unknown } | null)?.newWaitMinutes;
  const espera = typeof nova === 'number' && nova >= 0 ? `Sua espera fica em ${Math.round(nova)} min. ` : '';
  return {
    titulo: 'Menos de 1 hora',
    mensagem: `${espera}Sair da fila depois da troca gera multa.`,
  };
}
