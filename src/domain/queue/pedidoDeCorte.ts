import { ClientAttendance } from '@services/attendanceService';

import { estaAtivo } from './reconciliar';
import { formatClockTime } from './types';

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

/**
 * O aviso de que o pedido foi enviado (guia de texto, §4.6): o título diz o fato
 * e o corpo, uma linha — quem responde e ATÉ QUANDO. A hora substitui "5
 * minutos": a pessoa olha o relógio, não faz a conta.
 *
 * Pedido para outro dia (DEC-27) não tem prazo: o profissional decide quando abrir
 * a agenda daquele dia, e o corpo diz isso. `quando` ("amanhã às 09:30") entra
 * quando a pessoa escolheu o horário: é o único lugar que repete o que ela pediu.
 */
export function avisoDoPedidoEnviado(
  pedido: Pick<PedidoDeCorte, 'professionalName' | 'expiraEm'>,
  quando?: string,
): { titulo: string; mensagem: string } {
  const nome = pedido.professionalName || 'O profissional';
  const prefixo = quando ? `Você pediu para ${quando}. ` : '';
  const resposta =
    pedido.expiraEm != null
      ? `${nome} responde até ${formatClockTime(new Date(pedido.expiraEm))}.`
      : `${nome} responde quando abrir a agenda desse dia.`;
  return { titulo: 'Pedido enviado', mensagem: `${prefixo}${resposta}` };
}

/** O aviso de que o pedido venceu sem aceite (a resposta chega pelo vigia de `usePedidoDeCorte`). */
export function avisoDoPedidoNaoAceito(pedido: Pick<PedidoDeCorte, 'professionalName'>): {
  titulo: string;
  mensagem: string;
  escolherOutro: string;
  agendar: string;
} {
  return {
    titulo: 'Pedido não aceito',
    mensagem: `${pedido.professionalName || 'O profissional'} não respondeu a tempo.`,
    escolherOutro: 'Escolher outro',
    agendar: 'Agendar',
  };
}
