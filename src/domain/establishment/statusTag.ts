import { Establishment, isEffectivelyOpen } from "./types";
import { formatWaitTime } from "@domain/queue/types";

/**
 * A tag de status da loja — uma etiqueta, uma pergunta: **posso ir agora?**
 *
 * O QUE HAVIA ANTES, e por que nao funcionava:
 *
 *  · `Livre` (aberta sem fila) e `Aberto` (aberta COM fila) eram duas palavras
 *    que nao carregam a diferenca. Ninguem le "Aberto" e infere "tem fila" — e
 *    as duas pintavam igual, em brand-green solido.
 *  · a espera ja estava impressa na LINHA, a dois centimetros da tag, entao a
 *    tag repetia o que a linha dizia melhor.
 *  · e a propria linha repetia a si mesma: `queueLabel` + `timeLabel` davam
 *    "Sem fila · Agora" ou, pior, "2h · ~2h" — o mesmo numero duas vezes.
 *
 * A MESCLA: a tag passa a dizer o que a pessoa faria com a informacao.
 *
 *    Livre     aberta e sem fila  -> entra agora, sem esperar
 *    ~2h       aberta com fila    -> entra agora, esperando isso
 *    Agendar   fechada            -> so da pra marcar depois
 *
 * "Livre" fica onde e VERDADE (fila zero) em vez de dividir espaco com um
 * "Aberto" que nao se distingue dele. E o numero, que e a informacao real,
 * substitui a palavra vaga. A linha larga a espera e fica com o que ela sabe
 * melhor: onde fica e que tipo de lugar e.
 */
export type StatusTag = {
  label: string;
  /** Loja aberta AGORA: so entao o ponto pisca e a tag recebe o acento. */
  live: boolean;
};

export function statusTag(e: Establishment): StatusTag {
  if (!isEffectivelyOpen(e)) return { label: "Agendar", live: false };

  const espera = e.estimated_wait_minutes;
  if (espera == null || espera === 0) return { label: "Livre", live: true };

  return { label: `~${formatWaitTime(espera)}`, live: true };
}
