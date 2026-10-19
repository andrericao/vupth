import { CANCELLATION_PENALTY_VALUE } from './types';

// Como se sai da fila — decisao D15 do Andre (24/09, em varias respostas; a
// versao final esta no vupth-docs):
//
// - "Sair da fila" SEMPRE pede dois toques seguidos. Um toque so mostra uma
//   faixa curta dizendo isso — sair por engano custa a vaga (e, fora da
//   tolerancia, dinheiro).
// - Enquanto a pessoa so espera, NADA aparece na tela. A faixa vem ao tentar
//   sair.
// - Com multa, a faixa diz o valor e o porque; os dois toques abrem uma
//   confirmacao "Sim / Nao", e so o "Sim" tira da fila.
// - Sem multa, os dois toques tiram direto, sem confirmacao.
//
// O "Sim" e a CIENCIA da multa (Backend 0caf229, em producao desde 26/09): o
// valor que a confirmacao mostrou vai junto na saida. Sem ele — ou com valor
// menor — o servidor responde 409 com o valor certo e NAO tira da fila; o app
// mostra o aviso com esse valor e repete no "Sim" (`avisoDaMultaDoServidor`).
//
// sair-da-fila-texto (Andre, 15/10): a faixa e de UMA linha, com o "Saiba
// mais" ao lado (o artigo do suporte). Sem multa, NAO diz que e de graca: so
// tenta reter ("Tem certeza? Faltam so X min"). Com multa: "Se sair, voce paga
// uma multa de R$ X".
//
// Substitui o dialogo do D10 ("Ficar na fila / Trocar de lugar / Sair mesmo
// assim"): a troca deixou de morar na saida (D16 a leva para um popup).

/** Quanto tempo entre os dois toques ainda conta como "seguidos". */
export const JANELA_DO_TOQUE_DUPLO_MS = 1500;

export function ehToqueDuplo(toqueAnterior: number | null, agora: number): boolean {
  return toqueAnterior != null && agora - toqueAnterior <= JANELA_DO_TOQUE_DUPLO_MS;
}

export type SaidaDaFila = {
  /** O texto da faixa que aparece no primeiro toque. */
  faixa: string;
  /** Com multa (ou sem saber), os dois toques pedem confirmacao. */
  confirmacao: { titulo: string; mensagem: string; sim: string; nao: string } | null;
  /** O valor que a confirmacao mostrou — vai na saida como a ciencia do cliente. */
  valorConfirmado: number | null;
};

const INSTRUCAO = 'Toque 2 vezes para sair.';

const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export function saidaDaFila(s: {
  /** Sair agora gera multa (pela regra que o servidor aplica hoje)? */
  multa: boolean;
  /**
   * O app ainda nao sabe quanto falta para a vez. Sem isso nao da para AFIRMAR
   * nem que ha multa nem que nao ha — e as duas mentiras custam caro.
   */
  semPrevisao?: boolean;
  /** Valor da multa — enquanto o servidor nao informa, o fixo de hoje. */
  valor?: number;
  /** Minutos que faltam para a vez — a frase de retencao sem multa. */
  minutos?: number | null;
}): SaidaDaFila {
  const valor = reais(s.valor ?? CANCELLATION_PENALTY_VALUE);

  if (s.semPrevisao) {
    return {
      faixa: `Se faltar menos de 1 h, sair gera multa de ${valor}. ${INSTRUCAO}`,
      confirmacao: {
        titulo: 'Sair da fila?',
        mensagem: `Se faltar menos de 1 hora para a sua vez, a saída gera multa de ${valor} no seu próximo atendimento.`,
        sim: 'Sim, sair',
        nao: 'Não',
      },
      valorConfirmado: s.valor ?? CANCELLATION_PENALTY_VALUE,
    };
  }

  if (s.multa) {
    return {
      faixa: `Se sair, você paga uma multa de ${valor}. ${INSTRUCAO}`,
      confirmacao: {
        titulo: 'Sair da fila?',
        mensagem: `A multa de ${valor} será cobrada no seu próximo atendimento.`,
        sim: 'Sim, sair',
        nao: 'Não',
      },
      valorConfirmado: s.valor ?? CANCELLATION_PENALTY_VALUE,
    };
  }

  const faltam = s.minutos != null && s.minutos > 0 ? ` Faltam só ${Math.ceil(s.minutos)} min.` : '';
  return { faixa: `Tem certeza?${faltam} ${INSTRUCAO}`, confirmacao: null, valorConfirmado: null };
}

/**
 * O servidor recusou a saida pedindo a ciencia da multa (409): o aviso com o
 * valor DELE. O "Sim" repete a saida com esse valor.
 */
export function avisoDaMultaDoServidor(valor: number) {
  return {
    titulo: 'Sair da fila?',
    mensagem: `Sair agora gera multa de ${reais(valor)}, cobrada no seu próximo atendimento. Sem o seu "Sim", você continua na fila.`,
    sim: 'Sim, sair',
    nao: 'Não',
  };
}

/**
 * A regra da multa dita ANTES de a pessoa entrar — nos Termos. Exigencia do
 * CDC: ate 25/09 o app so falava de multa na hora de sair. Saiu do resumo da
 * escolha de servicos em 05/10 (Andre, DEC-1). O valor e o limite sao os que o
 * servidor cobra hoje (D4 ainda nao chegou).
 */
export function regraDaMulta(valor: number = CANCELLATION_PENALTY_VALUE): string {
  return `Sair da fila faltando menos de 1 hora para a sua vez gera multa de ${reais(valor)}, cobrada no seu próximo atendimento. Trocar de lugar com outro cliente não tem custo.`;
}
