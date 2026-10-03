import { Establishment } from './types';

// Vitrine paginada (CONTRATO NOVO do Backend, 03/10 — BAK paginacao-establishment,
// e0f072f): com `page`/`size`, o GET /establishment devolve uma pagina; sem
// eles, o array de sempre. O corte vem depois dos filtros e da ordenacao do
// servidor.

/** Lojas por pagina — o default do servidor. */
export const LOJAS_POR_PAGINA = 20;

export type PaginaDeLojas = {
  items: Establishment[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
};

/**
 * O servidor sem o e0f072f ignora `page`/`size` e devolve o array: vira uma
 * pagina so, sem proxima — a Home funciona igual nos dois.
 */
export function comoPagina(resposta: PaginaDeLojas | Establishment[], page: number): PaginaDeLojas {
  if (Array.isArray(resposta)) {
    return {
      items: resposta,
      page,
      size: resposta.length,
      totalItems: resposta.length,
      totalPages: 1,
      hasNext: false,
    };
  }
  return { ...resposta, items: resposta.items ?? [] };
}

/** A proxima pagina a pedir, ou `undefined` quando acabou. */
export function proximaPagina(ultima: PaginaDeLojas): number | undefined {
  return ultima.hasNext ? ultima.page + 1 : undefined;
}

/**
 * As paginas em uma lista so. Entre uma pagina e outra a ordem pode mudar (a
 * espera de cada loja anda), e a mesma loja apareceria duas vezes: fica a
 * primeira.
 */
export function juntarPaginas(paginas: PaginaDeLojas[]): Establishment[] {
  const vistos = new Set<string>();
  const lojas: Establishment[] = [];
  for (const p of paginas) {
    for (const e of p.items) {
      if (vistos.has(e.id)) continue;
      vistos.add(e.id);
      lojas.push(e);
    }
  }
  return lojas;
}

/**
 * Pagina so a vitrine pura. Com busca ou categoria, a lista vem inteira e o
 * app filtra como antes: a busca do app ignora acento e caixa, e uma categoria
 * rara poderia nao aparecer na primeira pagina — "nenhuma loja" com loja la.
 */
export function vitrinePaginada(s: { busca: string; categoria: string; praOntem: boolean }): boolean {
  return !s.praOntem && s.busca.trim() === '' && s.categoria === 'ALL';
}
