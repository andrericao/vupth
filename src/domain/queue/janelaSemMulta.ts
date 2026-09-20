import {
  CANCELLATION_PENALTY_VALUE,
  LATE_PENALTY_THRESHOLD_MINUTES,
  formatClockTime,
  incursLatePenalty,
} from "./types";

// A janela sem multa, dita ASSIM QUE O CLIENTE ENTRA (Andre, 20/09, no modelo
// do Uber: "cancelamento gratuito ate HH:MM").
//
// Ate aqui o app so falava de multa na HORA DE SAIR — e quem so descobre a
// regra no momento em que ela o pune nao teve escolha nenhuma. A regra nao
// mudou: e a mesma do `incursLatePenalty` (vagar um lugar com menos de 1h para
// ser atendido prejudica quem vem atras). O que muda e QUANDO ela e dita.
//
// ⚠️ Uma FAIXA, nao um popup (decisao do Andre): a mesma forma do aviso de loja
// fechada. Aviso que interrompe na entrada da fila e pedagio; aviso que fica na
// tela e informacao.
export type JanelaSemMulta =
  /** Ha tempo: sair ate `ate` (HH:MM) nao custa nada. */
  | { tipo: "semMulta"; ate: string; valor: number }
  /** Ja dentro da ultima hora: sair agora custa `valor`. */
  | { tipo: "comMulta"; valor: number }
  /** Sem previsao: nao da para AFIRMAR nem que ha janela nem que ela acabou. */
  | { tipo: "desconhecida" };

/**
 * `restanteMinutos` e o MESMO numero do countdown da tela, e o limite sai de
 * `enteredAt + estimatedMinutes` — a mesma ancora da "Previsao de inicio". Dois
 * horarios que se contradizem na mesma tela valem menos que um.
 */
export function janelaSemMulta(params: {
  enteredAt: number | null | undefined;
  estimatedMinutes: number | null | undefined;
  restanteMinutos: number | null | undefined;
}): JanelaSemMulta {
  const { enteredAt, estimatedMinutes, restanteMinutos } = params;

  if (enteredAt == null || estimatedMinutes == null || restanteMinutos == null) {
    return { tipo: "desconhecida" };
  }

  if (incursLatePenalty(restanteMinutos)) {
    return { tipo: "comMulta", valor: CANCELLATION_PENALTY_VALUE };
  }

  const inicioPrevisto = enteredAt + estimatedMinutes * 60000;
  const limite = inicioPrevisto - LATE_PENALTY_THRESHOLD_MINUTES * 60000;

  return {
    tipo: "semMulta",
    ate: formatClockTime(new Date(limite)),
    valor: CANCELLATION_PENALTY_VALUE,
  };
}

/** O texto da faixa. Fora do componente para o teste ler a REGRA, nao o pixel. */
export function textoDaJanela(janela: JanelaSemMulta): string | null {
  if (janela.tipo === "desconhecida") return null;

  if (janela.tipo === "semMulta") {
    return `Dá para sair da fila sem multa até ${janela.ate}. Depois disso, sair custa R$ ${janela.valor},00 — quem está atrás é chamado antes do previsto.`;
  }

  return `Falta menos de 1h para a sua vez: sair agora custa R$ ${janela.valor},00. Trocar de lugar com alguém da fila continua sem custo.`;
}
