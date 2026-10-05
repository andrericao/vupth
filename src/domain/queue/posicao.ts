// A posição na fila é um interruptor do PROFISSIONAL (decisão de 05/09,
// Backend 35d57c0): com `show_position: false`, ela some de todos os lugares
// de uma vez — o número grande e as bolinhas da QueueStatus, o "Faltam N" da
// Home e o "Nº da fila" da ServiceSelection. O tempo estimado fica sempre.
//
// Esta é a FONTE ÚNICA: nenhuma tela lê `position` sem passar por aqui. Cada
// tela decidindo por conta própria é o que faz uma ser esquecida.

type Preferencia = { id: string; show_position?: boolean | null };

/**
 * O profissional deixa mostrar a posição?
 * - Não achado na lista da loja (ainda carregando, ou falhou): `false` — melhor
 *   cair no tempo por um instante do que revelar o que ele escondeu.
 * - Achado sem o campo (backend anterior ao 35d57c0): `true`, como sempre foi.
 */
export function mostraPosicao(
  profissionais: Preferencia[] | undefined,
  professionalId: string | undefined,
): boolean {
  const prof = profissionais?.find((p) => p.id === professionalId);
  if (!prof) return false;
  return prof.show_position !== false;
}

/** A posição que a tela pode mostrar; `undefined` = mostrar o tempo no lugar. */
export function posicaoVisivel(position: number | null | undefined, mostra: boolean): number | undefined {
  return mostra && position != null ? position : undefined;
}
