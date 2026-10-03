import { LATE_PENALTY_THRESHOLD_MINUTES } from './types';

// Advertencia ANTES da multa (decisao do Andre, 03/10, CLI-12 · adiar-no-atraso).
//
// Adiar a vez NAO da tolerancia nova: o `toleranceUntil` continua o da entrada.
// Em troca, meia hora antes de a saida comecar a custar, o app diz a politica
// UMA vez e oferece as duas saidas sem custo: adiar a vez ou sair agora.
// Quem entra ja abaixo de 1h30 ve o aviso na entrada.

/** A espera (min) abaixo da qual o aviso aparece: meia hora antes da multa. */
export const LIMIAR_DA_ADVERTENCIA_MINUTOS = LATE_PENALTY_THRESHOLD_MINUTES + 30;

export function deveAdvertir(s: {
  /** Minutos ate a vez; null = ainda sem previsao. */
  restante: number | null | undefined;
  /** So quem espera (SCHEDULED) — em atendimento ja nao ha o que avisar. */
  aguardando: boolean;
  jaAdvertido: boolean;
}): boolean {
  if (!s.aguardando || s.jaAdvertido) return false;
  if (s.restante == null) return false; // sem previsao nao da para afirmar a faixa
  return s.restante < LIMIAR_DA_ADVERTENCIA_MINUTOS;
}

export type Advertencia = {
  titulo: string;
  mensagem: string;
  /** "Sair agora de graça" so aparece quando sair AGORA nao custa. */
  sairDeGraca: string | null;
  adiar: string | null;
  ficar: string;
};

export function advertenciaDaMulta(s: {
  /** Sair agora custa? (a mesma regra da saida: servidor, tolerancia, 1h). */
  sairCustaAgora: boolean;
  podeAdiar: boolean;
}): Advertencia {
  return {
    titulo: 'Sua vez está chegando',
    mensagem:
      'Se precisar desistir, faça agora: sair é de graça com 1 hora ou mais para a sua vez. ' +
      'Entre 30 minutos e 1 hora, a saída gera multa de R$ 3,00; com 30 minutos ou menos, R$ 5,00 — ' +
      'cobrada no seu próximo atendimento. Adiar a sua vez não tem custo.',
    sairDeGraca: s.sairCustaAgora ? null : 'Sair agora de graça',
    adiar: s.podeAdiar ? 'Adiar minha vez' : null,
    ficar: 'Continuar na fila',
  };
}
