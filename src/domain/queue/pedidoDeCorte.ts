import { ClientAttendance } from '@services/attendanceService';

import { estaAtivo } from './reconciliar';

// O pedido de corte (loja fechada para novos) e a RESPOSTA que o cliente nunca
// via (teste do Andre de 25/09: "nao sabe se foi aceita ou nao, nem por
// notificacao e nem por aviso no app — o atendimento nem aparece na fila").
//
// A resposta existia so em dois canais, e nenhum chegava: o WebSocket pessoal
// so conecta com fila ativa (quem so pediu corte ainda nao tem), e o push esta
// parado (q172). E a reconstrucao da fila pelo servidor roda uma vez por
// sessao — o corte aceito depois disso so aparecia fechando e abrindo o app.
//
// O conserto e so do Client: enquanto o pedido vale, o app olha o historico.
// Aceito = nasce um atendimento vivo com aquele profissional. Nada disso ate o
// prazo (+ folga) = o profissional recusou ou nao respondeu — o historico nao
// separa os dois, e o aviso diz isso com todas as letras.

export interface PedidoDeCorte {
  id: string;
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  establishmentName: string;
  /** ms — quando o pedido foi criado. */
  criadoEm: number;
  /**
   * ms — o `expires_at` do servidor (5 min depois da criacao). `null` = pedido
   * para outro dia (DEC-27, Backend d8039b5): vale ate o profissional decidir.
   */
  expiraEm: number | null;
}

/** O timer do servidor nega no prazo; a folga cobre relogio e poll atrasados. */
export const FOLGA_DO_PRAZO_MS = 60_000;

export type DesfechoDoPedido =
  | { tipo: 'aceito'; atendimento: ClientAttendance }
  | { tipo: 'sem_resposta' }
  | { tipo: 'aguardando' };

/**
 * Qualquer atendimento VIVO com o profissional do pedido conta como o aceite:
 * o app nao deixa o cliente estar duas vezes na fila do mesmo profissional, e o
 * historico nao traz o id do pedido que gerou o atendimento.
 */
export function desfechoDoPedido(
  pedido: PedidoDeCorte,
  historico: ClientAttendance[],
  agora: number,
): DesfechoDoPedido {
  const atendimento = historico.find(
    (a) => a.professionalId === pedido.professionalId && estaAtivo(a.status),
  );
  if (atendimento) return { tipo: 'aceito', atendimento };
  if (pedido.expiraEm != null && agora > pedido.expiraEm + FOLGA_DO_PRAZO_MS) return { tipo: 'sem_resposta' };
  return { tipo: 'aguardando' };
}

/** Monta o pedido a partir da resposta do `POST /attendances/cut-requests`. */
export function pedidoDaResposta(
  resposta: { id: string; created_at?: string | null; expires_at?: string | null },
  contexto: Pick<PedidoDeCorte, 'professionalId' | 'professionalName' | 'establishmentId' | 'establishmentName'>,
  agora: number,
): PedidoDeCorte {
  const criadoEm = Date.parse(resposta.created_at ?? '') || agora;
  // `expires_at: null` = pedido para outro dia, sem prazo (DEC-27). Sem o campo
  // (backend anterior) ou ilegivel, vale o contrato antigo: 5 minutos.
  if (resposta.expires_at === null) return { id: resposta.id, ...contexto, criadoEm, expiraEm: null };
  const expiraEm = Date.parse(resposta.expires_at ?? '') || criadoEm + 5 * 60_000;
  return { id: resposta.id, ...contexto, criadoEm, expiraEm };
}
