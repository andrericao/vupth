// posicao-na-lista (DEC-176, pedido do Backend): ao abrir uma loja vinda da lista, o app conta em que
// posicao ela estava (1 = primeira) no ?list_position=N do GET /establishment/id/{id}. E so metrica: serve
// ao Andre para decidir o teto real da lista; nao muda a resposta. Guardado em memoria (nao na rota) para
// nao ir parar na URL da web nem num link compartilhado; vale para a proxima busca daquela loja e some.

const posicoes = new Map<string, number>();

/** A lista marca a posicao (indice + 1) antes de navegar. Indice invalido nao marca nada. */
export function marcarPosicaoNaLista(establishmentId: string, indice: number): void {
  if (!establishmentId || !Number.isInteger(indice) || indice < 0) return;
  posicoes.set(establishmentId, indice + 1);
}

/** A busca da loja leva a posicao uma vez so: quem abre pelo link, Recentes ou atalho nao manda nada. */
export function tirarPosicaoNaLista(establishmentId: string): number | undefined {
  const posicao = posicoes.get(establishmentId);
  posicoes.delete(establishmentId);
  return posicao;
}
