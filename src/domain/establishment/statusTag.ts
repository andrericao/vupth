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
 * A TAG RESPONDE "POSSO IR AGORA?", e as tres respostas nomeiam a FILA:
 *
 *    Sem fila     aberta, fila zero  -> entra agora, sem esperar
 *    Fila de 2h   aberta com fila    -> entra agora, esperando isso
 *    Agendar    fechada            -> so da pra marcar depois
 *
 * ⚠️ POR QUE NAO "Livre" NEM "~2h" (as duas primeiras tentativas):
 *
 *  · `~2h` sozinho nao diz DE QUE — pode ser horario de funcionamento, tempo
 *    de deslocamento, duracao do servico. So quem ve um "Livre" em outra linha
 *    infere que e espera, e quem abre o app numa lista toda com fila nao tem
 *    esse contraste.
 *  · `Livre` tem o mesmo problema pelo outro lado: livre de que? De custo?
 *    Tambem so funciona por comparacao.
 *
 * Nomear a fila nas duas resolve sem depender de contraste: "Sem fila" e
 * "Fila de 2h" sao a mesma pergunta respondida de dois jeitos, e cada uma se
 * explica sozinha na primeira leitura. O "de" e como a pessoa FALA — "fila de
 * duas horas" —, e telegrafar ("Fila 2h") economiza dois caracteres a custo de
 * soar como etiqueta de sistema. Pior caso: "Fila de 1h 30min", 16 caracteres. A linha larga a espera e fica com o que
 * ela sabe melhor: onde fica e que tipo de lugar e.
 */
export type StatusTag = {
  label: string;
  /** Loja aberta AGORA: so entao o ponto pisca e a tag recebe o acento. */
  live: boolean;
};

export function statusTag(e: Establishment): StatusTag {
  if (!isEffectivelyOpen(e)) return { label: "Agendar", live: false };

  const espera = e.estimated_wait_minutes;
  if (espera == null || espera === 0) return { label: "Sem fila", live: true };

  return { label: `Fila de ${formatWaitTime(espera)}`, live: true };
}
