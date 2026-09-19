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
  if (code === 'ESTABLISHMENT_NOT_OPEN') return { tipo: 'loja-fechada', mensagem: LOJA_FECHADA };

  return {
    tipo: 'outro',
    mensagem: e?.response?.data?.message || e?.message || 'Erro ao entrar na fila',
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
