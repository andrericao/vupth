import { CANCELLATION_PENALTY_VALUE } from './types';

// O aviso que aparece ao tocar em "Sair da fila" (decisão D10 do Andre, 17/09).
//
// Até aqui, com multa, o aviso só dizia o valor e oferecia "Não" e "Sim, sair".
// O cliente que ia sair quase sempre queria OUTRA HORA, não sair do sistema — e
// a saída sem custo existia, só que em outro botão da tela. Agora o aviso diz
// POR QUE há multa (o próximo cliente é chamado antes do previsto) e oferece a
// troca de lugar antes de "sair mesmo assim".
//
// Só a TROCA (#42) é oferecida como saída sem multa: "ir para o fim" e
// "remarcar" também vagam um lugar perto do início e têm multa com menos de 1h.

export type AcaoDaSaida = 'ficar' | 'trocar' | 'sair';

export type BotaoDaSaida = {
  texto: string;
  acao: AcaoDaSaida;
  estilo: 'cancel' | 'default' | 'destructive';
};

export type AvisoDeSaida = {
  titulo: string;
  mensagem: string;
  botoes: BotaoDaSaida[];
};

export function avisoDeSaida(s: {
  /** Sair agora gera multa? */
  multa: boolean;
  /** A troca de lugar está disponível (cliente aguardando)? */
  podeTrocar: boolean;
  /** Valor que a saída custaria — enquanto o backend não informa, o fixo de hoje. */
  valor?: number;
  /**
   * O app ainda não sabe quanto falta para a vez (entrou por aceite de corte, ou
   * a fila foi reconciliada e o servidor não respondeu). Sem isso não dá para
   * AFIRMAR nem que há multa nem que não há — e as duas mentiras custam caro:
   * uma cobra o que não deve, a outra promete grátis o que vai ser cobrado.
   */
  semPrevisao?: boolean;
}): AvisoDeSaida {
  if (s.semPrevisao) {
    const valorIncerto = `R$ ${(s.valor ?? CANCELLATION_PENALTY_VALUE).toFixed(2).replace(".", ",")}`;
    const base =
      "Ainda estamos calculando quanto falta para a sua vez. Se faltar menos de 1 hora, " +
      `sair agora gera multa de ${valorIncerto} no seu próximo atendimento.`;
    return {
      titulo: "Sair da fila",
      mensagem: s.podeTrocar
        ? `${base}\n\nTrocar de lugar com outro cliente nunca tem multa.`
        : base,
      botoes: [
        { texto: "Ficar na fila", acao: "ficar", estilo: "cancel" },
        ...(s.podeTrocar
          ? [{ texto: "Trocar de lugar", acao: "trocar" as const, estilo: "default" as const }]
          : []),
        { texto: "Sair mesmo assim", acao: "sair", estilo: "destructive" },
      ],
    };
  }

  if (!s.multa) {
    return {
      titulo: 'Sair da fila',
      mensagem: 'Tem certeza que deseja sair da fila?',
      botoes: [
        { texto: 'Não', acao: 'ficar', estilo: 'cancel' },
        { texto: 'Sim, sair', acao: 'sair', estilo: 'destructive' },
      ],
    };
  }

  const valor = s.valor ?? CANCELLATION_PENALTY_VALUE;
  const reais = `R$ ${valor.toFixed(2).replace('.', ',')}`;
  const impacto =
    'Você está perto de ser atendido. Se sair agora, o próximo cliente é chamado antes do ' +
    `previsto e pode não estar pronto — por isso a saída gera multa de ${reais} no seu ` +
    'próximo atendimento.';

  if (!s.podeTrocar) {
    return {
      titulo: 'Sair da fila',
      mensagem: impacto,
      botoes: [
        { texto: 'Ficar na fila', acao: 'ficar', estilo: 'cancel' },
        { texto: 'Sair mesmo assim', acao: 'sair', estilo: 'destructive' },
      ],
    };
  }

  return {
    titulo: 'Sair da fila',
    mensagem: `${impacto}\n\nNão pode esperar agora? Trocar de lugar com outro cliente não tem multa.`,
    botoes: [
      { texto: 'Ficar na fila', acao: 'ficar', estilo: 'cancel' },
      { texto: 'Trocar de lugar', acao: 'trocar', estilo: 'default' },
      { texto: 'Sair mesmo assim', acao: 'sair', estilo: 'destructive' },
    ],
  };
}
