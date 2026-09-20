// Expediente do profissional — quem aparece em "Trabalhando" e quem aparece em
// "Fora" na tela da loja.
//
// Contrato de 19/09 (backend): `professionals-with-queue` devolve TODO
// profissional com pelo menos um servico, e o `work_status` vem por
// profissional. Em 18/09 quem nao marcou expediente sumia da tela; a decisao
// durou um dia e foi revertida, porque esconder o pessoal fora do expediente
// desencontrava a vitrine — a lista anunciava 3 profissionais e a loja abria
// com 0. Quem separa agora e o app.
export type WorkStatus = "WORKING" | "ON_BREAK" | "OFF";

export type ComExpediente = { work_status?: WorkStatus | string | null };

/**
 * `ON_BREAK` fica junto de quem trabalha, com rotulo proprio: intervalo e
 * almoco ou saida rapida, a pessoa volta e a fila dela segue andando.
 *
 * ⚠️ Campo AUSENTE conta como trabalhando, de proposito. Producao ainda roda o
 * backend anterior ao contrato de 19/09; se a ausencia caisse em "Fora", uma
 * loja inteira apareceria fora do expediente — o erro mais caro dos dois.
 */
export function estaNoExpediente(status?: WorkStatus | string | null): boolean {
  return status !== "OFF";
}

export function emIntervalo(status?: WorkStatus | string | null): boolean {
  return status === "ON_BREAK";
}

/**
 * Loja fechada leva todos a `OFF` na mesma transacao (backend, 18/09), entao
 * uma loja fechada aparece com todo mundo em "Fora" — nunca vazia.
 */
export function agruparPorExpediente<T extends ComExpediente>(profissionais: T[]) {
  const trabalhando: T[] = [];
  const fora: T[] = [];

  for (const p of profissionais) {
    (estaNoExpediente(p.work_status) ? trabalhando : fora).push(p);
  }

  return { trabalhando, fora };
}
