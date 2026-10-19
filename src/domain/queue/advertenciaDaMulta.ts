import { LATE_PENALTY_THRESHOLD_MINUTES, formatClockTime } from './types';

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

/**
 * Ate que horas sair e de graca: o aviso diz a HORA ("Depois das 14:35"), nao as
 * faixas de valor — a pessoa nao calcula "entre 30 minutos e 1 hora", ela olha o
 * relogio. E o limite de 1 h antes da vez, ou o fim da tolerancia do servidor, o
 * que for mais tarde (dentro da tolerancia sair nao custa, D13). As faixas e os
 * valores ficam no artigo do Suporte.
 */
export function limiteDaSaidaGratis(s: {
  /** Minutos ate a vez (a previsao de agora). */
  restante: number;
  /** Relogio de agora (ms) — injetado para o calculo ser testavel. */
  agora: number;
  /** Fim da tolerancia informado pelo servidor (ms), se houver. */
  toleranceUntil?: number | null;
}): number {
  const antesDeComecarACustar = s.agora + Math.max(s.restante - LATE_PENALTY_THRESHOLD_MINUTES, 0) * 60000;
  return Math.max(antesDeComecarACustar, s.toleranceUntil ?? 0);
}

export type Advertencia = {
  titulo: string;
  mensagem: string;
  /** "Sair" so aparece quando sair AGORA nao custa. */
  sairDeGraca: string | null;
  adiar: string | null;
  ficar: string;
};

export function advertenciaDaMulta(s: {
  /** Sair agora custa? (a mesma regra da saida: servidor, tolerancia, 1h). */
  sairCustaAgora: boolean;
  podeAdiar: boolean;
  /** Ate quando sair e de graca (ms) — ver `limiteDaSaidaGratis`. */
  gratisAte?: number | null;
}): Advertencia {
  // De 244 caracteres para uma linha (guia de texto, §4.2). O corpo antigo
  // trazia as tres faixas de valor e o "adiar nao tem custo"; a hora substitui
  // as faixas e o resto mora no "Saiba mais".
  let mensagem = 'Sair agora gera multa.';
  if (!s.sairCustaAgora) {
    mensagem = s.gratisAte
      ? `Sair agora ainda é de graça. Depois das ${formatClockTime(new Date(s.gratisAte))}, gera multa.`
      : 'Sair agora ainda é de graça. Depois, gera multa.';
  }
  return {
    titulo: 'Sua vez está chegando',
    mensagem,
    sairDeGraca: s.sairCustaAgora ? null : 'Sair',
    adiar: s.podeAdiar ? 'Adiar' : null,
    ficar: 'Ficar',
  };
}
