import { reais as reaisDe } from '@domain/queue/multasPendentes';

// pendencia-de-pagamento (CLI-30, Andre 15/10) sobre o contrato do pagamento-pix
// (Backend 2a2b0ec + adendos): o atendimento tem o seu status, e o pagamento
// tem outro. Finalizado e nao pago, o cliente ve a pendencia, um ponto leva ao
// pagamento e, ao tentar marcar de novo, um MODAL explica e traz o "Pagar".

export type StatusDoPagamento = 'PENDING' | 'AWAITING_CONFIRMATION' | 'PAID';

/** Um item de GET /clients/me/pending-payments (e do 409 PAYMENT_PENDING). */
export type PagamentoPendente = {
  attendance_id: string;
  status: StatusDoPagamento;
  amount: number | string;
  professional_name?: string | null;
  establishment_name?: string | null;
  finished_at?: string | null;
};

/**
 * pagamento-pelo-asaas (DEC-119, Backend dea2d00): com a conexao ligada, o
 * pagamento traz `gateway`; sem ele, vale o Pix do profissional e o "Já paguei".
 */
export type GatewayDoPagamento = {
  provider: string;
  /** SANDBOX = pagamento de teste, sem dinheiro real. */
  mode?: 'SANDBOX' | 'REAL' | string | null;
  status?: string | null;
  pix_copy_paste?: string | null;
  pix_qr_image?: string | null;
  invoice_url?: string | null;
};

/** GET /attendances/{id}/payment. */
export type Pagamento = {
  status: StatusDoPagamento | null;
  services_value?: number | string | null;
  penalties_value?: number | string | null;
  amount: number | string;
  pix_copy_paste?: string | null;
  holder_name?: string | null;
  key_type?: string | null;
  /** A chave Pix do profissional, em texto (pix-do-profissional-ao-concluir). */
  pix_key?: string | null;
  /** Presente quando o pagamento sai pelo Asaas (o webhook confirma sozinho). */
  gateway?: GatewayDoPagamento | null;
  claimed_at?: string | null;
  confirmed_at?: string | null;
};

/** Valor que pode vir como texto (BigDecimal) ou faltar. */
export function reais(valor: number | string | null | undefined): string {
  const n = Number(valor);
  return reaisDe(Number.isFinite(n) ? n : 0);
}

/**
 * O Pix a mostrar: o do Asaas quando o pagamento vem com `gateway`, senao o do
 * profissional. `teste` = sandbox (faixa "Pagamento de teste", sem dinheiro real).
 */
export function pixDoPagamento(p: Pagamento | null | undefined): {
  codigo: string | null;
  qrImagem: string | null;
  viaAsaas: boolean;
  teste: boolean;
} {
  const g = p?.gateway ?? null;
  return {
    codigo: g?.pix_copy_paste || p?.pix_copy_paste || null,
    qrImagem: g?.pix_qr_image || null,
    viaAsaas: !!g,
    teste: g?.mode === 'SANDBOX',
  };
}

/** A linha do status, curta. */
export function textoDoStatus(status: StatusDoPagamento | null | undefined): string {
  if (status === 'PAID') return 'Pago';
  if (status === 'AWAITING_CONFIRMATION') return 'Aguardando o profissional confirmar';
  return 'Pagamento pendente';
}

/** O cliente ainda pode tocar em "Já paguei" (so do PENDING). */
export function podeAvisarQuePagou(status: StatusDoPagamento | null | undefined): boolean {
  return status === 'PENDING';
}

/** Os itens do 409 PAYMENT_PENDING (ao entrar na fila, agendar ou pedir corte), ou null. */
export function pendenciasDoErro(erro: unknown): PagamentoPendente[] | null {
  const data = (erro as { response?: { status?: number; data?: { code?: string; items?: unknown } } } | null)?.response
    ?.data;
  if (data?.code !== 'PAYMENT_PENDING') return null;
  return Array.isArray(data.items) ? (data.items as PagamentoPendente[]) : [];
}

/**
 * O texto do modal ao tentar marcar com pendência. Título que diz o fato e corpo
 * de uma linha, "R$ X com Nome." (guia de texto, §4.5): o título já diz que há
 * pagamento pendente, e o "Pagar" ao lado diz o que fazer.
 */
export function avisoDaPendencia(itens: PagamentoPendente[]): { titulo: string; mensagem: string } {
  const total = itens.reduce((soma, i) => soma + (Number(i.amount) || 0), 0);
  const quem = itens.length === 1 && itens[0].professional_name ? ` com ${itens[0].professional_name}` : '';
  return {
    titulo: 'Pagamento pendente',
    mensagem: itens.length
      ? `${reais(total)}${quem}.`
      : 'Há um pagamento pendente. Pague para marcar de novo.',
  };
}
