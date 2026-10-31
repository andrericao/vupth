import { create } from "zustand";

// abrir-com-lista-salva (DEC-148): o app pode abrir a Home com a lista de lojas guardada ANTES de o backend
// (Render Free, cold start) responder. Enquanto ele acorda, so o que LE segue; tudo que GRAVA (login, cadastro,
// entrar na fila, agendar, pagar, pedir corte) espera aqui, com o aviso "Preparando o servidor…" em vez de erro.
// Por padrao o servidor conta como pronto: so o App, ao abrir pelo cache, o marca como nao pronto.

type Estado = { pronto: boolean; esperando: number };

export const useProntidaoStore = create<Estado>(() => ({ pronto: true, esperando: 0 }));

let liberar: (() => void)[] = [];

/** O App chama ao abrir pelo cache: as gravacoes passam a esperar o servidor. */
export function exigirServidor() {
  useProntidaoStore.setState({ pronto: false });
}

/** O portao de readiness respondeu (ou estourou o teto): as gravacoes esperando seguem. */
export function marcarServidorPronto() {
  useProntidaoStore.setState({ pronto: true });
  const fila = liberar;
  liberar = [];
  fila.forEach((seguir) => seguir());
}

/** Resolve na hora com o servidor pronto; senao, quando ele ficar. O contador alimenta o aviso. */
export async function esperarServidor(): Promise<void> {
  if (useProntidaoStore.getState().pronto) return;
  useProntidaoStore.setState((s) => ({ esperando: s.esperando + 1 }));
  try {
    await new Promise<void>((seguir) => liberar.push(seguir));
  } finally {
    useProntidaoStore.setState((s) => ({ esperando: s.esperando - 1 }));
  }
}
