/**
 * Por que a entrada na fila foi recusada — e o que a tela faz com isso.
 *
 * Os três portões do backend chegam como 409 com `code` próprio, e cada um pede
 * uma reação diferente. Até 18/09 a tela tratava só o da loja fechada; o resto
 * caía numa tela inteira ("NÃO DEU CERTO") com a mensagem crua do servidor —
 * "uma tela branca com log do backend", nas palavras do Andre.
 *
 * Aviso vira DIÁLOGO: o cliente tocou em algo, a resposta é sobre aquele toque,
 * e ele continua onde estava. Tela cheia é para quando não há caminho de volta.
 */
import { MENSAGEM_SO_AGENDA } from '@domain/professional/modo';
import { mensagemDoErro } from '@domain/erros/mensagemDoErro';

export type RecusaAoEntrar =
  | { tipo: 'ja-na-fila'; mensagem: string }
  | { tipo: 'nao-aceita'; mensagem: string }
  | { tipo: 'loja-fechada'; mensagem: string }
  | { tipo: 'outro'; mensagem: string };

const JA_NA_FILA =
  'Você já está na fila deste profissional. Toque em "Ver minha fila" para acompanhar.';
const NAO_ACEITA =
  'Este profissional não está aceitando novos clientes agora. Você pode pedir um corte — ele decide se aceita.';
const LOJA_FECHADA =
  'A loja não está aberta agora, então não dá para entrar na fila direto. Você pode pedir um corte — o profissional tem 5 minutos para aceitar.';

export function recusaAoEntrar(error: unknown): RecusaAoEntrar {
  const e = error as {
    response?: { status?: number; data?: { code?: string; message?: string } };
    message?: string;
  };
  const code = e?.response?.data?.code;

  // O texto do backend é humano e pode explicar mais que o nosso; mas a frase
  // de AÇÃO é nossa, porque só a tela sabe o que oferece.
  if (code === 'CLIENT_ALREADY_IN_QUEUE') return { tipo: 'ja-na-fila', mensagem: JA_NA_FILA };
  if (code === 'PROFESSIONAL_NOT_ACCEPTING_NEW') return { tipo: 'nao-aceita', mensagem: NAO_ACEITA };
  // So agenda (Backend 8e6c00f): o mesmo caminho de volta — o agendar esta na tela anterior.
  if (code === 'PROFESSIONAL_AGENDA_ONLY') return { tipo: 'nao-aceita', mensagem: MENSAGEM_SO_AGENDA };
  if (code === 'ESTABLISHMENT_NOT_OPEN') return { tipo: 'loja-fechada', mensagem: LOJA_FECHADA };

  return {
    tipo: 'outro',
    mensagem: mensagemDoErro(e, 'Erro ao entrar na fila'),
  };
}

/** O 409 não traz o id do atendimento que já existe — acha-se pelo profissional. */
export function atendimentoNaFilaDoProfissional<T extends { professionalId: string; status: string }>(
  historico: T[],
  professionalId: string,
): T | null {
  const ocupado = ['SCHEDULED', 'LATE', 'IN_PROGRESS', 'PAUSED'];
  return (
    historico.find((a) => a.professionalId === professionalId && ocupado.includes(a.status)) ?? null
  );
}

/**
 * O aviso quando o APARELHO ja sabe que o cliente esta numa fila (q246 reprovou
 * em 25/09: "sou encaminhado ao servico que ja existe, mas nao aparece aviso").
 *
 * O dialogo de 19/09 so disparava na recusa do SERVIDOR — e o servidor so e
 * consultado quando o aparelho nao sabe da fila. Sabendo, a tela mostrava a fila
 * existente em silencio, e se ela fosse de OUTRO profissional, sem explicar por
 * que a pessoa via uma fila que nao pediu.
 */
export function avisoDeFilaExistente(
  atual: { professionalId: string; professionalName?: string; establishmentName?: string },
  professionalIdTentado: string,
): { titulo: string; mensagem: string } {
  const quem = atual.professionalName || 'este profissional';
  if (atual.professionalId === professionalIdTentado) {
    return {
      titulo: 'Você já está na fila',
      mensagem: `Você já está na fila de ${quem} — esta é a sua vez, abaixo.`,
    };
  }
  const onde = atual.establishmentName ? ` (${atual.establishmentName})` : '';
  return {
    titulo: 'Você já está em outra fila',
    mensagem: `Você já está na fila de ${quem}${onde} — é ela que aparece abaixo. Para entrar em outra, saia desta primeiro.`,
  };
}
