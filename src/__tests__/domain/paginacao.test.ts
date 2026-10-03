import {
  comoPagina,
  juntarPaginas,
  proximaPagina,
  vitrinePaginada,
  PaginaDeLojas,
} from '@domain/establishment/paginacao';
import { Establishment } from '@domain/establishment/types';

const loja = (id: string) => ({ id, name: `Loja ${id}` }) as unknown as Establishment;

const pagina = (page: number, ids: string[], hasNext: boolean): PaginaDeLojas => ({
  items: ids.map(loja),
  page,
  size: 20,
  totalItems: 45,
  totalPages: 3,
  hasNext,
});

describe('comoPagina — a resposta do GET /establishment com page/size', () => {
  it('a página do contrato passa como veio', () => {
    const p = pagina(1, ['a', 'b'], true);
    expect(comoPagina(p, 1)).toEqual(p);
  });

  it('o servidor sem o e0f072f devolve o array: uma página só, sem próxima', () => {
    expect(comoPagina([loja('a'), loja('b')], 0)).toEqual({
      items: [loja('a'), loja('b')],
      page: 0,
      size: 2,
      totalItems: 2,
      totalPages: 1,
      hasNext: false,
    });
  });

  it('sem items, lista vazia', () => {
    const semItens = { ...pagina(3, [], false), items: undefined } as unknown as PaginaDeLojas;
    expect(comoPagina(semItens, 3).items).toEqual([]);
  });
});

describe('proximaPagina', () => {
  it('com hasNext, a seguinte', () => {
    expect(proximaPagina(pagina(0, ['a'], true))).toBe(1);
  });

  it('sem hasNext, acabou', () => {
    expect(proximaPagina(pagina(2, ['a'], false))).toBeUndefined();
  });
});

describe('juntarPaginas', () => {
  it('as páginas em ordem, numa lista só', () => {
    const ids = juntarPaginas([pagina(0, ['a', 'b'], true), pagina(1, ['c'], false)]).map((e) => e.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('a loja que mudou de página entre um pedido e outro aparece uma vez só', () => {
    const ids = juntarPaginas([pagina(0, ['a', 'b'], true), pagina(1, ['b', 'c'], false)]).map((e) => e.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('nenhuma página, nenhuma loja', () => {
    expect(juntarPaginas([])).toEqual([]);
  });
});

describe('vitrinePaginada — quando a Home pagina', () => {
  it('a vitrine pura: sem busca, sem categoria, sem Pra ontem', () => {
    expect(vitrinePaginada({ busca: '', categoria: 'ALL', praOntem: false })).toBe(true);
    expect(vitrinePaginada({ busca: '   ', categoria: 'ALL', praOntem: false })).toBe(true);
  });

  it('com busca, a lista inteira (a busca do app ignora acento e caixa)', () => {
    expect(vitrinePaginada({ busca: 'joao', categoria: 'ALL', praOntem: false })).toBe(false);
  });

  it('com categoria, a lista inteira', () => {
    expect(vitrinePaginada({ busca: '', categoria: 'NAIL_SALON', praOntem: false })).toBe(false);
  });

  it('o Pra ontem tem a sua própria busca', () => {
    expect(vitrinePaginada({ busca: '', categoria: 'ALL', praOntem: true })).toBe(false);
  });
});
