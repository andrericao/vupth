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
// ⏳ A TOLERANCIA (5 ou 10 min desde a entrada, D13) ainda nao existe no
// servidor — hoje ele cobra sem tolerancia, pela regra de menos de 1h. O app
// segue o que o servidor cobra: quando ele expuser ate quando a tolerancia
// vale, a faixa sem preco entra aqui, e nao antes (mostrar uma janela que o
// servidor nao honra seria prometer o que ele nao cumpre).
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
};

const INSTRUCAO = 'toque em "Sair da fila" duas vezes seguidas';

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
}): SaidaDaFila {
  const valor = reais(s.valor ?? CANCELLATION_PENALTY_VALUE);

  if (s.semPrevisao) {
    return {
      faixa: `Ainda estamos calculando a sua vez. Se faltar menos de 1 hora, sair gera multa de ${valor} no seu próximo atendimento. Para sair mesmo assim, ${INSTRUCAO}.`,
      confirmacao: {
        titulo: 'Sair da fila?',
        mensagem: `Se faltar menos de 1 hora para a sua vez, a saída gera multa de ${valor} no seu próximo atendimento.`,
        sim: 'Sim, sair',
        nao: 'Não',
      },
    };
  }

  if (s.multa) {
    return {
      faixa: `Falta menos de 1 hora: sair agora gera multa de ${valor} no seu próximo atendimento — quem está atrás é chamado antes do previsto. Para sair mesmo assim, ${INSTRUCAO}.`,
      confirmacao: {
        titulo: 'Sair da fila?',
        mensagem: `A multa de ${valor} será cobrada no seu próximo atendimento.`,
        sim: 'Sim, sair',
        nao: 'Não',
      },
    };
  }

  return { faixa: `Para sair da fila, ${INSTRUCAO}.`, confirmacao: null };
}

/**
 * A regra da multa dita ANTES de a pessoa entrar — no resumo da escolha de
 * servicos e nos Termos. Exigencia do CDC: ate 25/09 o app so falava de multa
 * na hora de sair. Um texto so, para os dois lugares nao divergirem; o valor e
 * o limite sao os que o servidor cobra hoje (D4 ainda nao chegou).
 */
export function regraDaMulta(valor: number = CANCELLATION_PENALTY_VALUE): string {
  return `Sair da fila faltando menos de 1 hora para a sua vez gera multa de ${reais(valor)}, cobrada no seu próximo atendimento. Trocar de lugar com outro cliente não tem custo.`;
}
