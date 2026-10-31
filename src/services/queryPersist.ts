import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";

// Persistencia do cache do React Query entre aberturas do app.
//
// O problema (item 8 do PRD, medido em 31/08): `App.tsx` criava um
// `new QueryClient()` pelado. Toda abertura partia de cache VAZIO e o cliente
// encarava o skeleton inteiro antes de ver uma loja. O backend ja fez a parte
// dele (a listagem parou de pagar por loja); o que sobrava era isto.
//
// Com a persistencia, a ULTIMA lista conhecida pinta NA HORA e revalida atras.
// Muda "skeleton ate a API responder" para "lista imediata, atualiza sozinha".

/** Quanto tempo o cache salvo continua valendo. Passou disso, abre do zero. */
export const VALIDADE_MS = 24 * 60 * 60 * 1000;

// ⚠️ SO o que e seguro mostrar velho. A decisao mais importante deste arquivo.
//
// Lista de lojas pode aparecer com dados de ontem por um segundo: e revalidada
// logo em seguida e nada de ruim acontece se uma loja mudou de nome.
//
// Fila, posicao, status de atendimento e ofertas de troca NAO podem: mostrar
// "voce e o proximo" de uma fila que ja andou, ou um atendimento que ja
// terminou, faz o cliente sair de casa na hora errada — e a estimativa E o
// produto. Esses ficam de fora de proposito, e so entram aqui com decisao.
// DEC-148 (ajuste do André, 31/10): so a lista de lojas e a vitrine paginada da Home (a Home abre por ela). A loja e os
// servicos do profissional carregam horario, aberta/fechada e preco, que nunca aparecem do cache: a proposta 6 do
// estudo (salvar `establishment` e `service-items`) saiu por isso. O que muda com o tempo DENTRO da lista mostra
// skeleton ate o Backend confirmar (`domain/establishment/frescor`).
export const PERSISTIVEIS = new Set<string>(["establishments", "establishments-paginas"]);

export function devePersistir(query: Query): boolean {
  const raiz = query.queryKey[0];
  return (
    // So resposta boa: persistir erro faria o app abrir mostrando falha antiga.
    query.state.status === "success" && typeof raiz === "string" && PERSISTIVEIS.has(raiz)
  );
}

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "vupth_query_cache",
});

/** Sair da conta apaga o cache salvo (estudo-desempenho, proposta 6): o proximo login parte limpo. */
export async function limparCacheSalvo(): Promise<void> {
  try {
    await persister.removeClient();
  } catch {
    // sem cache salvo ou sem disco: nada a apagar
  }
}
